"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import { compressImage, needsCompression, blobToFile, getFileSizeMB } from "@/services/imageCompression";

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

export default function ReportPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [addressData, setAddressData] = useState<AddressData | null>(null);
    const [addressLoading, setAddressLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];

            // Validate the file is actually readable (fails for cloud-only OneDrive/iCloud files)
            try {
                await selectedFile.slice(0, 1).arrayBuffer();
            } catch {
                toast.error(
                    "Cannot read this file. If it's stored in OneDrive, iCloud, or Google Drive, please download it locally first, then try again."
                );
                return;
            }

            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleClearPreview = useCallback(() => {
        setFile(null);
        setPreview(null);
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
        handleGetLocation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (location) {
            resolveAddress(location.lat, location.lng);
        }
    }, [location, resolveAddress]);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }
        setLoading(true);
        setAddressData(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setLoading(false);
            },
            (error) => {
                console.error("Geolocation Error:", error.message);
                setLoading(false);
                let msg = "Unable to retrieve location.";
                if (error.code === 1) msg = "Location permission denied.";
                else if (error.code === 2) msg = "Position unavailable.";
                else if (error.code === 3) msg = "Location request timed out.";
                toast.error(msg);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !location) {
            toast.error("Please provide both an image and your location.");
            return;
        }
        setAnalyzing(true);

        let uploadFile: File | Blob = file;
        if (needsCompression(file)) {
            try {
                const originalSize = getFileSizeMB(file);
                toast.loading("Compressing image...", { id: "compress" });
                const compressedBlob = await compressImage(file);
                uploadFile = blobToFile(compressedBlob, file.name);
                const newSize = getFileSizeMB(uploadFile);
                toast.success(`Compressed: ${originalSize.toFixed(1)}MB → ${newSize.toFixed(1)}MB`, { id: "compress" });
            } catch (err) {
                console.warn("Compression failed, using original:", err);
            }
        }

        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("latitude", location.lat.toString());
        formData.append("longitude", location.lng.toString());
        formData.append("timestamp", new Date().toISOString());

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

                            {preview ? (
                                <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700" style={{ height: "12rem" }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            display: "block",
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleClearPreview}
                                        className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
                                        aria-label="Remove image"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Mobile */}
                                    <div className="flex gap-3 md:hidden">
                                        <label className="flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 text-center cursor-pointer transition-all active:scale-[0.97] dark:border-blue-800 dark:bg-blue-900/10">
                                            <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Take Photo</span>
                                            <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                                        </label>
                                        <label className="flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center cursor-pointer transition-all active:scale-[0.97] dark:border-slate-700 dark:bg-slate-900">
                                            <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Gallery</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
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
                                        onClick={handleGetLocation}
                                        isLoading={loading}
                                    >
                                        Detect Location
                                    </Button>
                                </div>

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

                        {/* ── Submit ── */}
                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={analyzing}
                            disabled={!file || !location}
                        >
                            {analyzing ? "Analyzing Evidence..." : "Submit Report"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
