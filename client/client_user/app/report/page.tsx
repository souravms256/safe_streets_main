"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api, { getApiErrorMessage } from "@/services/api";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import { compressImage, needsCompression, blobToFile } from "@/services/imageCompression";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { savePendingReport, initDB } from "@/services/offlineQueue";
import { syncPendingReports, requestBackgroundSync } from "@/services/offlineSync";

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
const TRAFFIC_REPORT_MODE = "traffic";
const COMMUNITY_GARBAGE_REPORT_MODE = "community_garbage";
const COMMUNITY_REPORT_TAG = "Community Related Issue";

type ReportMode = typeof TRAFFIC_REPORT_MODE | typeof COMMUNITY_GARBAGE_REPORT_MODE;

function hasGrantedLocationPermission(permission: Awaited<ReturnType<typeof Geolocation.checkPermissions>>) {
    return permission.location === "granted" || permission.coarseLocation === "granted";
}

function getBrowserPosition(options: PositionOptions) {
    return new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
}

function getBrowserGeolocationMessage(error: GeolocationPositionError) {
    if (error.code === 1) return "Location permission denied.";
    if (error.code === 2) {
        return "Location is available on your device, but the browser could not get a fix yet. Turn on Wi-Fi or GPS and try again.";
    }
    if (error.code === 3) return "Location request timed out. Please try again.";
    return "Unable to retrieve location.";
}

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
    const [reportMode, setReportMode] = useState<ReportMode>(TRAFFIC_REPORT_MODE);
    const [isOnline, setIsOnline] = useState(true);
    const [showImageOptions, setShowImageOptions] = useState(false);

    // New user-input fields
    const [userViolationTypes, setUserViolationTypes] = useState<string[]>([]);
    const [description, setDescription] = useState("");
    const [severity, setSeverity] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");

    const isCommunityGarbageReport = reportMode === COMMUNITY_GARBAGE_REPORT_MODE;
    const canCaptureFromCamera = Capacitor.isNativePlatform() || typeof window === "undefined";

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

    const handleOpenCamera = useCallback(async () => {
        try {
            if (!Capacitor.isNativePlatform()) {
                // Fallback for web - trigger file input with camera capture
                const input = document.getElementById('camera-input') as HTMLInputElement;
                input?.click();
                return;
            }

            // Use Capacitor Camera API on native platforms
            const photo = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Uri,
                source: CameraSource.Camera,
                correctOrientation: true,
            });

            if (photo.webPath) {
                const response = await fetch(photo.webPath);
                const blob = await response.blob();
                const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                
                if (files.length >= 3) {
                    toast.error("Maximum 3 images allowed per report.");
                    return;
                }

                setFiles(prev => [...prev, file]);
                setPreviews(prev => [...prev, photo.webPath!]);
            }
        } catch (error) {
            console.error('Camera error:', error);
            // Silently ignore if user cancelled
        }
    }, [files.length]);

    const handleOpenGallery = useCallback(async () => {
        try {
            if (!Capacitor.isNativePlatform()) {
                // Fallback for web - trigger file input
                const input = document.getElementById('gallery-input') as HTMLInputElement;
                input?.click();
                return;
            }

            // Use Capacitor Camera API on native platforms
            const photo = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Uri,
                source: CameraSource.Photos,
                correctOrientation: true,
            });

            if (photo.webPath) {
                const response = await fetch(photo.webPath);
                const blob = await response.blob();
                const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                
                if (files.length >= 3) {
                    toast.error("Maximum 3 images allowed per report.");
                    return;
                }

                setFiles(prev => [...prev, file]);
                setPreviews(prev => [...prev, photo.webPath!]);
            }
        } catch (error) {
            console.error('Gallery error:', error);
            // Silently ignore if user cancelled
        }
    }, [files.length]);

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
        // Initialize IndexedDB for offline storage
        void initDB().catch(err => console.error('Failed to init offline DB:', err));

        // Track online/offline status
        const handleOnline = () => {
            console.log('App is online');
            setIsOnline(true);
            // Try to sync pending reports when coming back online
            void syncPendingReports().catch(err => console.error('Auto-sync failed:', err));
        };

        const handleOffline = () => {
            console.log('App is offline');
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Set initial online status
        setIsOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
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

    const handleGetLocation = useCallback(async (showToast = true) => {
        setLoading(true);
        setAddressData(null);
        setLocationError(null);

        try {
            if (!Capacitor.isNativePlatform()) {
                if (!navigator.geolocation) {
                    const msg = "Geolocation is not supported by your browser.";
                    setLocationError(msg);
                    if (showToast) toast.error(msg);
                    setLoading(false);
                    return;
                }

                const position = await getBrowserPosition({
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0,
                });

                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setLoading(false);
                return;
            }

            // Capacitor handles both Web and Native permissions elegantly
            const permission = await Geolocation.checkPermissions();
            if (!hasGrantedLocationPermission(permission)) {
                const request = await Geolocation.requestPermissions();
                if (!hasGrantedLocationPermission(request)) {
                    const msg = "Location permission is blocked. Please enable it for this app and try again.";
                    setLocationError(msg);
                    if (showToast) toast.error(msg);
                    setLoading(false);
                    return;
                }
            }

            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0
            });

            setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            });
            setLocationError(null);
            setLoading(false);
        } catch (error) {
            console.error("Geolocation Error:", error);
            const msg =
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                typeof (error as GeolocationPositionError).code === "number"
                    ? getBrowserGeolocationMessage(error as GeolocationPositionError)
                    : (error as Error).message === "Location services are not enabled"
                      ? "Location services are disabled on your device. Turn on your GPS or Location Service and try again."
                      : (error as Error).message || "Unable to retrieve location. Please check your permissions.";
            setLocationError(msg);
            if (showToast) toast.error(msg);
            setLoading(false);
        }
    }, []);

    const handleSubmit = async () => {
        if (files.length === 0 || !location) {
            toast.error("Please provide at least one image and your location.");
            return;
        }
        setAnalyzing(true);

        try {
            // Prepare form data
            const preparedFiles: File[] = [];
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
                preparedFiles.push(uploadFile instanceof File ? uploadFile : new File([uploadFile], f.name));
            }

            const formDataObj: Parameters<typeof savePendingReport>[0] = {
                latitude: location.lat.toString(),
                longitude: location.lng.toString(),
                timestamp: new Date().toISOString(),
                report_mode: reportMode,
            };

            // Append optional user-input fields
            if (isCommunityGarbageReport) {
                formDataObj.user_violation_type = COMMUNITY_REPORT_TAG;
            } else if (userViolationTypes.length > 0) {
                formDataObj.user_violation_type = userViolationTypes.join(", ");
            }
            if (description) formDataObj.description = description;
            if (severity) formDataObj.severity = severity;
            if (!isCommunityGarbageReport && vehicleNumber) {
                formDataObj.vehicle_number = vehicleNumber;
            }

            // Check if online
            if (!isOnline) {
                // Save to offline queue
                const reportId = await savePendingReport(formDataObj, preparedFiles);
                console.log('Report saved to offline queue:', reportId);
                
                await requestBackgroundSync();
                
                toast.success(
                    isCommunityGarbageReport
                        ? "Report saved offline. It will be submitted when you're back online."
                        : "Report saved offline. It will be submitted when you're back online."
                );
                router.push("/pending-reports");
                return;
            }

            // If online, submit directly
            const formData = new FormData();
            for (const f of preparedFiles) {
                formData.append("files", f);
            }
            formData.append("latitude", formDataObj.latitude);
            formData.append("longitude", formDataObj.longitude);
            formData.append("timestamp", formDataObj.timestamp);
            formData.append("report_mode", formDataObj.report_mode);

            if (formDataObj.user_violation_type) {
                formData.append("user_violation_type", formDataObj.user_violation_type);
            }
            if (formDataObj.description) formData.append("description", formDataObj.description);
            if (formDataObj.severity) formData.append("severity", formDataObj.severity);
            if (formDataObj.vehicle_number) formData.append("vehicle_number", formDataObj.vehicle_number);

            const response = await api.post("/violations/", formData);
            const { detected_type } = response.data;
            if (isCommunityGarbageReport) {
                toast.success("Report submitted! Thanks for tagging this as a community garbage issue.");
            } else {
                toast.success(`Report Submitted! AI Detected: ${detected_type}`);
            }
            router.push("/dashboard");
        } catch (error) {
            const message = getApiErrorMessage(error);
            console.error("Submission failed:", {
                error,
                message,
                reportMode,
                fileCount: files.length,
                location,
            });
            toast.error(message);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (files.length === 0 || !location) {
            toast.error("Please provide at least one image and your location.");
            return;
        }
        setAnalyzing(true);

        try {
            // Prepare form data
            const preparedFiles: File[] = [];
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
                preparedFiles.push(uploadFile instanceof File ? uploadFile : new File([uploadFile], f.name));
            }

            const formDataObj: Parameters<typeof savePendingReport>[0] = {
                latitude: location.lat.toString(),
                longitude: location.lng.toString(),
                timestamp: new Date().toISOString(),
                report_mode: reportMode,
            };

            // Append optional user-input fields
            if (isCommunityGarbageReport) {
                formDataObj.user_violation_type = COMMUNITY_REPORT_TAG;
            } else if (userViolationTypes.length > 0) {
                formDataObj.user_violation_type = userViolationTypes.join(", ");
            }
            if (description) formDataObj.description = description;
            if (severity) formDataObj.severity = severity;
            if (!isCommunityGarbageReport && vehicleNumber) {
                formDataObj.vehicle_number = vehicleNumber;
            }

            // Save to offline queue
            const reportId = await savePendingReport(formDataObj, preparedFiles);
            console.log('Report saved to offline queue:', reportId);
            
            await requestBackgroundSync();
            
            toast.success("Report saved! You can view it in Pending Uploads.");
            router.push("/pending-reports");
        } catch (error) {
            const message = getApiErrorMessage(error);
            console.error("Save failed:", error);
            toast.error(message);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-6 md:py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-lg px-4 sm:px-6">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {isCommunityGarbageReport ? "Report a Community Garbage Issue" : "Report a Traffic Violation"}
                    </h1>
                    <button
                        onClick={() => router.push('/pending-reports')}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Pending</span>
                    </button>
                </div>

                {!isOnline && (
                    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/40">
                        <div className="flex items-start gap-3">
                            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">You&apos;re offline</p>
                                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">Your report will be saved and submitted automatically when you&apos;re back online.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            void handleSubmit();
                        }}
                        className="space-y-8"
                    >
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-6 dark:border-slate-700 dark:bg-slate-800/50">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Report Mode
                                </h2>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Choose whether this image should go through AI traffic analysis or be saved as a community garbage issue.
                                </p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setReportMode(TRAFFIC_REPORT_MODE)}
                                    className={`rounded-2xl border p-4 text-left transition-all ${
                                        !isCommunityGarbageReport
                                            ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-600/10 dark:border-blue-500 dark:bg-blue-900/20"
                                            : "border-slate-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700"
                                    }`}
                                >
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Traffic Violation</p>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                        Runs AI on the first image and keeps the current reporting flow.
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReportMode(COMMUNITY_GARBAGE_REPORT_MODE)}
                                    className={`rounded-2xl border p-4 text-left transition-all ${
                                        isCommunityGarbageReport
                                            ? "border-emerald-600 bg-emerald-50 shadow-md shadow-emerald-600/10 dark:border-emerald-500 dark:bg-emerald-900/20"
                                            : "border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700"
                                    }`}
                                >
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Community Issue</p>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                        Upload a garbage image, skip AI, and tag it directly as a community-related issue.
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* ── Image Upload ── */}
                                <div>
                            <div className="mb-4 flex items-center justify-between">
                                <label className="block text-sm font-medium text-slate-900 dark:text-white">
                                    {isCommunityGarbageReport ? "Capture Garbage Image" : "Capture Evidence"}
                                </label>
                                {showImageOptions && (
                                    <button
                                        type="button"
                                        onClick={() => setShowImageOptions(false)}
                                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                    >
                                        Hide options
                                    </button>
                                )}
                            </div>

                            {/* Show Camera/Gallery buttons when no images */}
                            {previews.length === 0 && !showImageOptions && (
                                <button
                                    type="button"
                                    onClick={() => setShowImageOptions(true)}
                                    className="mb-4 w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-8 text-center hover:border-slate-400 hover:bg-slate-100 transition-colors dark:border-slate-600 dark:bg-slate-900/50 dark:hover:border-slate-500 dark:hover:bg-slate-900"
                                >
                                    <svg className="mx-auto mb-2 h-8 w-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Tap to add photo</p>
                                </button>
                            )}

                            {/* Camera and Gallery Buttons */}
                            {showImageOptions && (
                                <div className="mb-6 grid grid-cols-2 gap-5">
                                    <input
                                        type="file"
                                        id="camera-input"
                                        className="hidden"
                                        accept="image/*"
                                        capture={canCaptureFromCamera ? "environment" : undefined}
                                        onChange={handleFileChange}
                                        multiple
                                    />
                                    <input
                                        type="file"
                                        id="gallery-input"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        multiple
                                    />
                                    <label
                                        htmlFor="camera-input"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleOpenCamera();
                                        }}
                                        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 py-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors dark:border-blue-700 dark:bg-blue-900/10 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 focus:outline-none"
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open camera input"
                                        aria-expanded={showImageOptions}
                                    >
                                        <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Camera</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Capture a new</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">evidence image.</span>
                                    </label>
                                    <label
                                        htmlFor="gallery-input"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleOpenGallery();
                                        }}
                                        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 py-6 text-center hover:border-emerald-400 hover:bg-emerald-50 transition-colors dark:border-emerald-700 dark:bg-emerald-900/10 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/20 focus:outline-none"
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open gallery input"
                                        aria-expanded={showImageOptions}
                                    >
                                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Gallery</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Pick an image</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">already saved on</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">the device.</span>
                                    </label>
                                </div>
                            )}

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
                                                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors focus:outline-none"
                                                    aria-label={`Remove image ${i + 1}`}
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
                                        <button
                                            type="button"
                                            onClick={handleClearAll}
                                            className="text-xs text-red-500 hover:text-red-600 font-medium focus:outline-none"
                                            aria-label="Clear all images"
                                        >
                                            Clear all
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Location ── */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-white">
                                Location
                            </label>
                            <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <svg className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="text-sm text-slate-600 dark:text-slate-400 break-words">
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
                                        className="w-full sm:w-auto whitespace-nowrap"
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
                                {isCommunityGarbageReport ? "Community Issue Details" : "Violation Details"}
                            </h3>

                            {!isCommunityGarbageReport && (
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
                            )}

                            {/* Description */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={isCommunityGarbageReport ? "Describe the garbage issue you observed..." : "Describe the violation or road issue you observed..."}
                                    rows={4}
                                    maxLength={500}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 transition-colors resize-none"
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

                            {!isCommunityGarbageReport && (
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
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 transition-colors uppercase tracking-wider"
                                    />
                                </div>
                            )}
                        </div>

                        {/* ── Submit Buttons ── */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={files.length === 0 || !location || analyzing}
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                            >
                                {analyzing ? "Saving..." : "💾 Save"}
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={files.length === 0 || !location || analyzing}
                                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                            >
                                {analyzing && <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                                {analyzing ? "Uploading & Analyzing..." : "📤 Upload & Analyze"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
