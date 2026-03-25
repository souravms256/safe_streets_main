"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import { compressImage, needsCompression, blobToFile } from "@/services/imageCompression";

interface AddressData {
    display_name: string;
    short_address: string;
    road: string;
    neighbourhood: string;
    suburb: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
}

const VIOLATION_TYPES = [
    "Helmet Violation",
    "Triple Riding",
    "Pothole",
    "No Parking",
    "Signal Jumping",
    "Wrong Way Driving",
    "Other",
];

const SEVERITY_OPTIONS = ["Low", "Medium", "High"];

export default function ReportPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [addressData, setAddressData] = useState<AddressData | null>(null);
    const [addressLoading, setAddressLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    // New user-input fields
    const [userViolationTypes, setUserViolationTypes] = useState<string[]>([]);
    const [description, setDescription] = useState("");
    const [severity, setSeverity] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const totalFiles = files.length + newFiles.length;
            if (totalFiles > 3) {
                toast.error("Maximum 3 images allowed per report.");
                return;
            }

            for (const f of newFiles) {
                try {
                    await f.slice(0, 1).arrayBuffer();
                } catch {
                    toast.error("Cannot read a selected file. Try downloading it locally first.");
                    return;
                }
            }

            setFiles(prev => [...prev, ...newFiles]);
            setPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
        }
    };

    const handleRemoveFile = useCallback((index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleClearAll = useCallback(() => {
        setFiles([]);
        setPreviews([]);
    }, []);

    const resolveAddress = useCallback(async (lat: number, lng: number) => {
        setAddressLoading(true);
        try {
            const response = await api.get(`/geocode/reverse`, {
                params: { lat, lon: lng },
            });
            if (response.data?.success && response.data?.data) {
                setAddressData(response.data.data);
            }
        } catch (err) {
            console.warn("Address resolution failed:", err);
            setAddressData(null);
        } finally {
            setAddressLoading(false);
        }
    }, []);

    useEffect(() => {
        void handleGetLocation(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (location) {
            resolveAddress(location.lat, location.lng);
        }
    }, [location, resolveAddress]);

    const getCurrentPosition = useCallback((options: PositionOptions) => {
        return new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    }, []);

    const getGeolocationMessage = useCallback((error: GeolocationPositionError) => {
        if (error.code === 1) return "Location permission denied.";
        if (error.code === 2) {
            return "Location is available on your device, but the browser could not get a fix yet. Turn on Wi-Fi, make sure your system location is active, and try Detect Location again.";
        }
        if (error.code === 3) return "Location request timed out. Try again in an open area or with Wi-Fi enabled.";
        return "Unable to retrieve location.";
    }, []);

    const handleGetLocation = useCallback(async (showToast = true) => {
        if (!navigator.geolocation) {
            const msg = "Geolocation is not supported by your browser.";
            setLocationError(msg);
            if (showToast) toast.error(msg);
            return;
        }

        setLoading(true);
        setAddressData(null);
        setLocationError(null);

        try {
            if ("permissions" in navigator && navigator.permissions?.query) {
                const permission = await navigator.permissions.query({ name: "geolocation" });
                if (permission.state === "denied") {
                    const msg = "Location permission is blocked in the browser. Enable it for this site and try again.";
                    setLocationError(msg);
                    if (showToast) toast.error(msg);
                    setLoading(false);
                    return;
                }
            }
        } catch (error) {
            console.warn("Unable to read geolocation permission state:", error);
        }

        const attempts: PositionOptions[] = [
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
        ];

        let lastError: GeolocationPositionError | null = null;

        for (const options of attempts) {
            try {
                const position = await getCurrentPosition(options);
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setLocationError(null);
                setLoading(false);
                return;
            } catch (error) {
                const geoError = error as GeolocationPositionError;
                lastError = geoError;
                console.error("Geolocation Error:", geoError.message);

                if (geoError.code === 1) {
                    break;
                }
            }
        }

        const msg = lastError ? getGeolocationMessage(lastError) : "Unable to retrieve location.";
        setLocationError(msg);
        if (showToast) toast.error(msg);
        setLoading(false);
    }, [getCurrentPosition, getGeolocationMessage]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0 || !location) {
            toast.error("Please provide at least one image and your location.");
            return;
        }
        setAnalyzing(true);

        const formData = new FormData();
        for (const f of files) {
            let uploadFile: File | Blob = f;
            if (needsCompression(f)) {
                try {
                    const compressedBlob = await compressImage(f);
                    uploadFile = blobToFile(compressedBlob, f.name);
                } catch (err) {
                    console.warn("Compression failed, using original:", err);
                }
            }
            formData.append("files", uploadFile);
        }
        formData.append("latitude", location.lat.toString());
        formData.append("longitude", location.lng.toString());
        formData.append("timestamp", new Date().toISOString());

        // Append optional user-input fields
        if (userViolationTypes.length > 0) formData.append("user_violation_type", userViolationTypes.join(", "));
        if (description) formData.append("description", description);
        if (severity) formData.append("severity", severity);
        if (vehicleNumber) formData.append("vehicle_number", vehicleNumber);

        try {
            const response = await api.post("/violations/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const { detected_type } = response.data;
            toast.success(`Report Submitted! AI Detected: ${detected_type}`);
            router.push("/dashboard");
        } catch (error) {
            console.error("Submission failed:", error);
            toast.error("Failed to submit report. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-6 md:py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-lg px-4 sm:px-6">
                <h1 className="mb-8 text-2xl font-bold text-slate-900 dark:text-white">
                    Report a Traffic Violation
                </h1>

                <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* ── Image Upload ── */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-white">
                                Capture Evidence
                            </label>

                            {/* Image Preview Gallery */}
                            {previews.length > 0 && (
                                <div className="space-y-3">
                                    <div className={`grid gap-2 ${previews.length === 1 ? '' : 'grid-cols-3'}`}>
                                        {previews.map((src, i) => (
                                            <div key={i} className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700" style={{ height: previews.length === 1 ? "12rem" : "8rem" }}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={src} alt={`Preview ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFile(i)}
                                                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
                                                    aria-label="Remove image"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{files.length}/3 images</span>
                                        <button type="button" onClick={handleClearAll} className="text-xs text-red-500 hover:text-red-600 font-medium">Clear all</button>
                                    </div>
                                </div>
                            )}

                            {previews.length < 3 && (
                                <div className="space-y-3">
                                    {/* Mobile */}
                                    <div className="flex gap-3 md:hidden">
                                        <label className="flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 text-center cursor-pointer transition-all active:scale-[0.97] dark:border-blue-800 dark:bg-blue-900/10">
                                            <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{previews.length === 0 ? 'Take Photo' : 'Add More'}</span>
                                            <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} multiple />
                                        </label>
                                        <label className="flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center cursor-pointer transition-all active:scale-[0.97] dark:border-slate-700 dark:bg-slate-900">
                                            <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Gallery</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} multiple />
                                        </label>
                                    </div>

                                    {/* Desktop */}
                                    <label
                                        htmlFor="file-upload-desktop"
                                        className="hidden md:flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition-all hover:border-blue-500 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-400 dark:hover:bg-blue-900/10"
                                    >
                                        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <div className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                            <span className="font-semibold text-blue-600 hover:text-blue-500">Upload a file</span>
                                            <span className="pl-1">or take a photo</span>
                                        </div>
                                        <input
                                            id="file-upload-desktop"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            multiple
                                        />
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* ── Location ── */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-white">
                                Location
                            </label>
                            <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            {location
                                                ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
                                                : "No location detected"}
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => void handleGetLocation()}
                                        isLoading={loading}
                                    >
                                        Detect Location
                                    </Button>
                                </div>

                                {locationError && (
                                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                                        {locationError}
                                    </div>
                                )}

                                {(addressLoading || addressData) && (
                                    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                                        {addressLoading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                                                <span className="text-xs text-slate-500 dark:text-slate-400">Resolving address...</span>
                                            </div>
                                        ) : addressData ? (
                                            <div className="space-y-1.5">
                                                <div className="flex items-start gap-2">
                                                    <svg className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
                                                        {addressData.short_address}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 ml-6 leading-relaxed">
                                                    {addressData.display_name}
                                                </p>
                                                {(addressData.city || addressData.state || addressData.postcode) && (
                                                    <div className="flex flex-wrap gap-1.5 ml-6 mt-1">
                                                        {addressData.city && (
                                                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                                {addressData.city}
                                                            </span>
                                                        )}
                                                        {addressData.state && (
                                                            <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                                {addressData.state}
                                                            </span>
                                                        )}
                                                        {addressData.postcode && (
                                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                                {addressData.postcode}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Violation Details ── */}
                        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Violation Details
                            </h3>

                            {/* Violation Type */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Type of Violation
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {VIOLATION_TYPES.map((type) => {
                                        const isSelected = userViolationTypes.includes(type);
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => {
                                                    setUserViolationTypes(prev =>
                                                        prev.includes(type)
                                                            ? prev.filter(t => t !== type)
                                                            : [...prev, type]
                                                    );
                                                }}
                                                className={`rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all ${
                                                    isSelected
                                                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/25"
                                                        : "bg-white border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                                                }`}
                                            >
                                                {isSelected && (
                                                    <svg className="inline-block h-3.5 w-3.5 mr-1 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                                {type}
                                            </button>
                                        );
                                    })}
                                </div>
                                {userViolationTypes.length > 0 && (
                                    <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                                        Selected: {userViolationTypes.join(", ")}
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe the violation or road issue you observed..."
                                    rows={3}
                                    maxLength={500}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 transition-colors resize-none"
                                />
                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 text-right">
                                    {description.length}/500
                                </p>
                            </div>

                            {/* Severity */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Severity
                                </label>
                                <div className="flex gap-2">
                                    {SEVERITY_OPTIONS.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setSeverity(severity === option ? "" : option)}
                                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                                                severity === option
                                                    ? option === "Low"
                                                        ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700"
                                                        : option === "Medium"
                                                        ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700"
                                                        : "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700"
                                                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500"
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Vehicle Number */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Vehicle Number
                                </label>
                                <input
                                    type="text"
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                                    placeholder="e.g. KA 01 AB 1234 (optional)"
                                    maxLength={20}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 transition-colors uppercase tracking-wider"
                                />
                            </div>
                        </div>

                        {/* ── Submit ── */}
                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={analyzing}
                            disabled={files.length === 0 || !location}
                        >
                            {analyzing ? "Analyzing Evidence..." : "Submit Report"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
