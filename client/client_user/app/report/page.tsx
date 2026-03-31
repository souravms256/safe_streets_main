"use client";

/**
 * Report Page — Capture Evidence
 *
 * Flow:
 *   1. User picks Camera or Gallery
 *   2. On native: Capacitor Camera plugin (Base64, no content:// URI issues)
 *      On web:    hidden <input type="file"> elements
 *   3. Timestamp captured immediately; geolocation fetched in parallel
 *   4. Preview shown with metadata card
 *   5. "Save"   → writes to Capacitor Filesystem + Preferences (status=pending)
 *   6. "Upload" → in-memory compress → POST /violations/ → AI detection
 *                 On failure: saves as pending automatically
 */

import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    startTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api, { UPLOAD_TIMEOUT_MS } from "@/services/api";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import { compressImage, needsCompression, blobToFile } from "@/services/imageCompression";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import { saveBlobLocally, savePendingReport, PendingReport, PendingReportFile } from "@/services/localDb";
import { Clock, MapPin, Upload, X, Camera as CameraIcon, Image as GalleryIcon } from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────────

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
const TRAFFIC_MODE = "traffic";
const COMMUNITY_MODE = "community_garbage";
const COMMUNITY_TAG = "Community Related Issue";

type ReportMode = typeof TRAFFIC_MODE | typeof COMMUNITY_MODE;

interface AddressData {
    display_name: string;
    short_address: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
}

// ─── Internal image type ────────────────────────────────────────────────────────

/**
 * Uniform representation of a captured/selected image regardless of source
 * (native camera, native gallery, or web file picker).
 */
interface CapturedImage {
    /** Unique ID for React keys */
    id: string;
    /** data URI or object URL — safe to use as <img src> */
    previewUrl: string;
    /** Raw image bytes — used for upload FormData and local save */
    blob: Blob;
    /** Image format: 'jpeg', 'png', etc. */
    format: string;
    /** True if previewUrl was created with createObjectURL (needs revoke on remove) */
    revokable: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function hasLocationPermission(
    perm: Awaited<ReturnType<typeof Geolocation.checkPermissions>>
) {
    return perm.location === "granted" || perm.coarseLocation === "granted";
}

function getBrowserPosition(opts: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, opts)
    );
}

function geolocationErrorMessage(err: GeolocationPositionError): string {
    if (err.code === 1) return "Location permission denied.";
    if (err.code === 2) return "Location unavailable. Turn on GPS and try again.";
    if (err.code === 3) return "Location request timed out. Please try again.";
    return "Unable to retrieve location.";
}

/** Decode a raw base64 string (no data-URI prefix) into a Blob. */
function base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
}

/** Compress a Blob for upload (in-memory only, no filesystem). */
async function prepareForUpload(blob: Blob, filename: string): Promise<File | Blob> {
    const asFile = blobToFile(blob, filename);
    if (!needsCompression(asFile)) return asFile;
    try {
        const compressed = await compressImage(asFile);
        return blobToFile(compressed, filename);
    } catch {
        return asFile;
    }
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ReportPage() {
    const router = useRouter();
    const webCamRef = useRef<HTMLInputElement | null>(null);
    const webGalleryRef = useRef<HTMLInputElement | null>(null);

    // Image state
    const [images, setImages] = useState<CapturedImage[]>([]);
    const [captureTimestamp, setCaptureTimestamp] = useState<string | null>(null);

    // Location state
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [locLoading, setLocLoading] = useState(false);
    const [addressLabel, setAddressLabel] = useState<string | null>(null);
    const [addressData, setAddressData] = useState<AddressData | null>(null);
    const [addressLoading, setAddressLoading] = useState(false);

    // UI state
    const [showPicker, setShowPicker] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [reportMode, setReportMode] = useState<ReportMode>(TRAFFIC_MODE);

    // Form fields
    const [violationTypes, setViolationTypes] = useState<string[]>([]);
    const [description, setDescription] = useState("");
    const [severity, setSeverity] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");

    const isCommunity = reportMode === COMMUNITY_MODE;
    const isNative = Capacitor.isNativePlatform();
    const canAddMore = images.length < 3;

    // ── Cleanup object URLs on unmount ──────────────────────────────────────────
    useEffect(() => {
        return () => {
            images.forEach((img) => {
                if (img.revokable) URL.revokeObjectURL(img.previewUrl);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Geolocation ─────────────────────────────────────────────────────────────
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        setAddressLoading(true);
        try {
            const res = await api.get("/geocode/reverse", {
                params: { lat, lon: lng },
            });
            if (res.data?.success && res.data?.data) {
                const data = res.data.data;
                setAddressData(data);
                if (data.short_address) {
                    setAddressLabel(data.short_address);
                }
            }
        } catch {
            // non-fatal
        } finally {
            setAddressLoading(false);
        }
    }, []);

    const getLocation = useCallback(async (silent = false) => {
        setLocLoading(true);
        setLocationError(null);

        try {
            let lat: number, lng: number;

            if (isNative) {
                const perm = await Geolocation.checkPermissions();
                if (!hasLocationPermission(perm)) {
                    const req = await Geolocation.requestPermissions();
                    if (!hasLocationPermission(req)) {
                        throw new Error(
                            "Location permission blocked. Enable it in Settings."
                        );
                    }
                }
                const pos = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 30000,
                });
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            } else {
                if (!navigator.geolocation) {
                    throw new Error("Geolocation not supported by your browser.");
                }
                const pos = await getBrowserPosition({
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 30000,
                });
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            }

            setLocation({ lat, lng });
            setLocationError(null);

            // Reverse geocode for human-readable label (fire-and-forget)
            void reverseGeocode(lat, lng);
        } catch (err) {
            const msg =
                err instanceof GeolocationPositionError
                    ? geolocationErrorMessage(err)
                    : (err as Error).message ||
                      "Unable to retrieve location. Check permissions.";
            setLocationError(msg);
            if (!silent) toast.error(msg);
        } finally {
            setLocLoading(false);
        }
    }, [isNative, reverseGeocode]);

    // Auto-fetch location on mount
    useEffect(() => {
        void getLocation(true);
    }, [getLocation]);

    // ── Image capture helpers ───────────────────────────────────────────────────

    const addImage = useCallback((img: CapturedImage) => {
        startTransition(() => {
            setImages((prev) => {
                if (prev.length >= 3) return prev;
                return [...prev, img];
            });
        });
        setCaptureTimestamp((prev) => prev ?? new Date().toISOString());
        setShowPicker(false);
    }, []);

    /**
     * Capture using Capacitor Camera plugin (native only).
     * Returns Base64 — no content:// URI, no intermediary FileReader issues.
     */
    const captureNative = useCallback(
        async (source: CameraSource) => {
            try {
                const photo = await Camera.getPhoto({
                    quality: 90,
                    resultType: CameraResultType.Base64,
                    source,
                    correctOrientation: true,
                    // Limit resolution to keep filesizes sane
                    width: 1920,
                    height: 1920,
                });

                const fmt = (photo.format || "jpeg").replace("jpg", "jpeg");
                const base64 = photo.base64String!;
                const mimeType = `image/${fmt}`;
                const blob = base64ToBlob(base64, mimeType);
                const previewUrl = URL.createObjectURL(blob);

                addImage({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    previewUrl,
                    blob,
                    format: fmt,
                    revokable: true,
                });

                // Fetch location in parallel if not already available
                if (!location) void getLocation(true);
            } catch (err) {
                const msg = (err as Error).message || "";
                if (!msg.includes("cancelled") && !msg.includes("User cancelled")) {
                    toast.error("Could not open camera. Check camera permissions.");
                }
            }
        },
        [addImage, getLocation, location]
    );

    /** Handle web <input type="file"> selection */
    const handleWebFileInput = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";

            if (images.length + files.length > 3) {
                toast.error("Maximum 3 images allowed per report.");
                return;
            }

            for (const file of files) {
                // Validate file is readable
                try {
                    await file.slice(0, 1).arrayBuffer();
                } catch {
                    toast.error("Cannot read selected file. Try again.");
                    return;
                }

                const fmt = (file.type.split("/")[1] || "jpeg").replace("jpg", "jpeg");
                const previewUrl = URL.createObjectURL(file);

                addImage({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    previewUrl,
                    blob: file,
                    format: fmt,
                    revokable: true,
                });
            }

            if (!location) void getLocation(true);
        },
        [addImage, getLocation, images.length, location]
    );

    const removeImage = useCallback((id: string) => {
        setImages((prev) => {
            const target = prev.find((img) => img.id === id);
            if (target?.revokable) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((img) => img.id !== id);
        });
    }, []);

    const clearAll = useCallback(() => {
        setImages((prev) => {
            prev.forEach((img) => {
                if (img.revokable) URL.revokeObjectURL(img.previewUrl);
            });
            return [];
        });
        setCaptureTimestamp(null);
    }, []);

    // ── Build pending report object (save path) ─────────────────────────────────

    const buildAndSaveToLocal = useCallback(async (): Promise<void> => {
        if (images.length === 0 || !location) {
            throw new Error("Images and location are required.");
        }

        // Save each blob to Capacitor Filesystem — throws on failure
        const savedFiles: PendingReportFile[] = await Promise.all(
            images.map((img) => saveBlobLocally(img.blob, img.format))
        );

        const report: PendingReport = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            files: savedFiles,
            latitude: location.lat,
            longitude: location.lng,
            timestamp: captureTimestamp ?? new Date().toISOString(),
            report_mode: reportMode,
            user_violation_type: isCommunity
                ? COMMUNITY_TAG
                : violationTypes.length > 0
                  ? violationTypes.join(", ")
                  : undefined,
            description: description || undefined,
            severity: severity || undefined,
            vehicle_number: !isCommunity && vehicleNumber ? vehicleNumber : undefined,
            status: "pending",
        };

        // Save metadata to Preferences
        await savePendingReport(report);
    }, [
        captureTimestamp,
        description,
        isCommunity,
        images,
        location,
        reportMode,
        severity,
        violationTypes,
        vehicleNumber,
    ]);

    // ── Build FormData for direct upload (no filesystem involved) ───────────────

    const buildFormData = useCallback(async (): Promise<FormData> => {
        const formData = new FormData();

        // Process all images in parallel for lower latency
        const uploadFiles = await Promise.all(
            images.map((img, i) => prepareForUpload(img.blob, `photo_${i}.${img.format}`))
        );

        uploadFiles.forEach((file) => {
            formData.append("files", file);
        });

        formData.append("latitude", location!.lat.toString());
        formData.append("longitude", location!.lng.toString());
        formData.append("timestamp", captureTimestamp ?? new Date().toISOString());
        formData.append("report_mode", reportMode);

        if (isCommunity) {
            formData.append("user_violation_type", COMMUNITY_TAG);
        } else if (violationTypes.length > 0) {
            formData.append("user_violation_type", violationTypes.join(", "));
        }

        if (description) formData.append("description", description);
        if (severity) formData.append("severity", severity);
        if (!isCommunity && vehicleNumber) formData.append("vehicle_number", vehicleNumber);

        return formData;
    }, [captureTimestamp, description, isCommunity, images, location, reportMode, severity, violationTypes, vehicleNumber]);

    // ── Save locally ────────────────────────────────────────────────────────────

    const handleSaveLocal = useCallback(async () => {
        if (images.length === 0) {
            toast.error("Capture at least one image first.");
            return;
        }
        if (!location) {
            toast.error("Location not available. Tap Detect Location first.");
            return;
        }

        setSaving(true);
        try {
            await buildAndSaveToLocal();
            toast.success("Saved locally! Upload whenever you have connectivity.");
            router.push("/pending");
        } catch (err) {
            console.error("Save local failed:", err);
            toast.error("Failed to save report. Please try again.");
        } finally {
            setSaving(false);
        }
    }, [buildAndSaveToLocal, images.length, location, router]);

    // ── Upload (primary flow → AI model detection → backend) ──────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (images.length === 0) {
            toast.error("Capture at least one image first.");
            return;
        }
        if (!location) {
            toast.error("Location not available. Tap Detect Location first.");
            return;
        }

        setAnalyzing(true);
        try {
            const formData = await buildFormData();
            // POST to backend → AI model detection (same as original flow)
            const response = await api.post("/violations/", formData, {
                headers: { "Content-Type": undefined }, // Let Axios/browser set multipart boundary automatically
                timeout: UPLOAD_TIMEOUT_MS, // 90 s — AI inference + Supabase upload can be slow
            });

            const { detected_type } = response.data;
            if (isCommunity) {
                toast.success("Report submitted! Thank you for flagging this issue.");
            } else {
                toast.success(`Report submitted! AI detected: ${detected_type}`);
            }
            router.push("/dashboard");
        } catch (uploadErr) {
            console.error("Upload failed:", uploadErr);

            // Attempt to save locally so work is not lost
            try {
                await buildAndSaveToLocal();
                toast.error(
                    "Upload failed — no connection? Report saved in Pending Uploads."
                );
            } catch (saveErr) {
                console.error("Save fallback also failed:", saveErr);
                toast.error("Upload failed and could not save locally. Please try again.");
            }

            router.push("/pending");
        } finally {
            setAnalyzing(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────────

    const busy = analyzing || saving;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">

            {/* ── Top bar ── */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {isCommunity ? "Report: Community Issue" : "Report: Traffic Violation"}
                </h1>
                <Link href="/pending">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Upload className="h-3.5 w-3.5" />
                        Pending
                    </Button>
                </Link>
            </div>

            <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">

                {/* ── Report mode ── */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setReportMode(TRAFFIC_MODE)}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${
                            !isCommunity
                                ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
                                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                        }`}
                    >
                        <p className={`text-sm font-semibold ${!isCommunity ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300"}`}>
                            Traffic
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            AI detects violations
                        </p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setReportMode(COMMUNITY_MODE)}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${
                            isCommunity
                                ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/20"
                                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                        }`}
                    >
                        <p className={`text-sm font-semibold ${isCommunity ? "text-emerald-700 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300"}`}>
                            Community
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            Garbage / other issues
                        </p>
                    </button>
                </div>

                {/* ── Image area ── */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900">
                    <div className="border-b border-slate-100 px-4 pt-4 pb-3 dark:border-slate-800">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {isCommunity ? "Garbage Evidence" : "Violation Evidence"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {images.length}/3 images captured
                        </p>
                    </div>

                    <div className="p-4">
                        {/* Preview grid */}
                        {images.length > 0 && (
                            <div
                                className={`mb-3 grid gap-2 ${
                                    images.length === 1 ? "grid-cols-1" : "grid-cols-3"
                                }`}
                            >
                                {images.map((img) => (
                                    <div
                                        key={img.id}
                                        className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                                        style={{ height: images.length === 1 ? "14rem" : "8rem" }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={img.previewUrl}
                                            alt="Evidence"
                                            className="h-full w-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(img.id)}
                                            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
                                            aria-label="Remove image"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Metadata pill shown after first capture */}
                        {images.length > 0 && (
                            <div className="mb-3 space-y-1.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                    <Clock className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                    <span>
                                        {captureTimestamp
                                            ? new Date(captureTimestamp).toLocaleString()
                                            : "—"}
                                    </span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500 mt-0.5" />
                                    <div className="flex flex-col">
                                        <span className="font-semibold">
                                            {location
                                                ? addressData?.short_address || addressLabel || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                                                : locLoading
                                                ? "Detecting location…"
                                                : "No location — tap Detect below"}
                                        </span>
                                        {location && (
                                            <span className="text-[10px] opacity-70">
                                                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Capture buttons */}
                        {canAddMore && (
                            <div className="space-y-2">
                                {images.length === 0 ? (
                                    // First image — show prominent options immediately
                                    <div className="grid grid-cols-2 gap-3">
                                        <CaptureButton
                                            label="Camera"
                                            sub="Take a fresh photo"
                                            icon={<CameraIcon className="h-6 w-6" />}
                                            color="blue"
                                            onClick={
                                                isNative
                                                    ? () => void captureNative(CameraSource.Camera)
                                                    : () => webCamRef.current?.click()
                                            }
                                        />
                                        <CaptureButton
                                            label="Gallery"
                                            sub="Pick from photos"
                                            icon={<GalleryIcon className="h-6 w-6" />}
                                            color="emerald"
                                            onClick={
                                                isNative
                                                    ? () => void captureNative(CameraSource.Photos)
                                                    : () => webGalleryRef.current?.click()
                                            }
                                        />
                                    </div>
                                ) : (
                                    // More images — compact row
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setShowPicker((p) => !p)}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 transition-all hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-600 dark:hover:text-blue-400"
                                        >
                                            <Upload className="h-4 w-4" />
                                            {showPicker ? "Hide options" : "Add another image"}
                                        </button>
                                        {showPicker && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <CaptureButton
                                                    label="Camera"
                                                    sub="Take a photo"
                                                    icon={<CameraIcon className="h-5 w-5" />}
                                                    color="blue"
                                                    compact
                                                    onClick={
                                                        isNative
                                                            ? () => void captureNative(CameraSource.Camera)
                                                            : () => webCamRef.current?.click()
                                                    }
                                                />
                                                <CaptureButton
                                                    label="Gallery"
                                                    sub="From photos"
                                                    icon={<GalleryIcon className="h-5 w-5" />}
                                                    color="emerald"
                                                    compact
                                                    onClick={
                                                        isNative
                                                            ? () => void captureNative(CameraSource.Photos)
                                                            : () => webGalleryRef.current?.click()
                                                    }
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {images.length > 0 && (
                            <button
                                type="button"
                                onClick={clearAll}
                                className="mt-2 text-xs font-medium text-red-500 hover:text-red-600"
                            >
                                Clear all images
                            </button>
                        )}

                        {/* Hidden web file inputs */}
                        <input
                            ref={webCamRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleWebFileInput}
                            multiple
                            className="hidden"
                        />
                        <input
                            ref={webGalleryRef}
                            type="file"
                            accept="image/*"
                            onChange={handleWebFileInput}
                            multiple
                            className="hidden"
                        />
                    </div>
                </div>

                {/* ── Location ── */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900">
                    <div className="flex flex-col gap-3 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex min-w-0 items-center gap-2">
                                <MapPin className="h-4 w-4 shrink-0 text-blue-500" />
                                <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {location
                                        ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
                                        : "No location detected"}
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                isLoading={locLoading}
                                onClick={() => void getLocation(false)}
                                className="shrink-0 text-xs"
                            >
                                Detect
                            </Button>
                        </div>

                        {addressLoading ? (
                             <div className="flex items-center gap-2 text-xs text-slate-500">
                                 <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                                 <span>Resolving address...</span>
                             </div>
                        ) : addressData ? (
                            <div className="space-y-1 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                                    {addressData.short_address}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {addressData.display_name}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {addressData.city && (
                                        <span className="rounded bg-blue-100 px-1 py-0.5 text-[9px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                            {addressData.city}
                                        </span>
                                    )}
                                    {addressData.state && (
                                        <span className="rounded bg-purple-100 px-1 py-0.5 text-[9px] font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                            {addressData.state}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                    {locationError && (
                        <div className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                            {locationError}
                        </div>
                    )}
                </div>

                {/* ── Violation Details ── */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900">
                    <div className="border-b border-slate-100 px-4 pt-4 pb-3 dark:border-slate-800">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {isCommunity ? "Issue Details" : "Violation Details"}
                        </p>
                    </div>
                    <div className="space-y-4 p-4">

                        {/* Violation type chips */}
                        {!isCommunity && (
                            <div>
                                <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Type (select all that apply)
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {VIOLATION_TYPES.map((type) => {
                                        const active = violationTypes.includes(type);
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() =>
                                                    setViolationTypes((prev) =>
                                                        prev.includes(type)
                                                            ? prev.filter((t) => t !== type)
                                                            : [...prev, type]
                                                    )
                                                }
                                                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                                                    active
                                                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                                        : "border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                }`}
                                            >
                                                {type}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={
                                    isCommunity
                                        ? "Describe the issue…"
                                        : "Describe the violation…"
                                }
                                rows={3}
                                maxLength={500}
                                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder-slate-400 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                            />
                            <p className="mt-0.5 text-right text-[10px] text-slate-400">
                                {description.length}/500
                            </p>
                        </div>

                        {/* Severity */}
                        <div>
                            <p className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                Severity
                            </p>
                            <div className="flex gap-2">
                                {SEVERITY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setSeverity(severity === opt ? "" : opt)}
                                        className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
                                            severity === opt
                                                ? opt === "Low"
                                                    ? "border-green-500 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                    : opt === "Medium"
                                                      ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                      : "border-red-500 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                : "border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Vehicle number */}
                        {!isCommunity && (
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Vehicle Number (optional)
                                </label>
                                <input
                                    type="text"
                                    value={vehicleNumber}
                                    onChange={(e) =>
                                        setVehicleNumber(e.target.value.toUpperCase())
                                    }
                                    placeholder="e.g. KA 01 AB 1234"
                                    maxLength={20}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm uppercase tracking-wide placeholder-slate-400 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Action buttons ── */}
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            isLoading={saving}
                            disabled={busy || images.length === 0 || !location}
                            onClick={() => void handleSaveLocal()}
                            className="w-full"
                        >
                            Save
                        </Button>
                        <Button
                            type="submit"
                            size="lg"
                            isLoading={analyzing}
                            disabled={busy || images.length === 0 || !location}
                            className="w-full"
                        >
                            {analyzing
                                ? isCommunity
                                    ? "Submitting…"
                                    : "Analysing…"
                                : "Upload"}
                        </Button>
                    </div>
                    <p className="mt-2 text-center text-[11px] text-slate-400">
                        Upload sends images to our AI model. Save stores them offline.
                    </p>
                </form>

            </div>
        </div>
    );
}

// ─── CaptureButton sub-component ────────────────────────────────────────────────

interface CaptureButtonProps {
    label: string;
    sub: string;
    icon: React.ReactNode;
    color: "blue" | "emerald";
    compact?: boolean;
    onClick: () => void;
}

function CaptureButton({ label, sub, icon, color, compact = false, onClick }: CaptureButtonProps) {
    const base =
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ";
    const colours = {
        blue: "border-blue-300 bg-blue-50/60 text-blue-700 hover:border-blue-500 hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10 dark:text-blue-300 dark:hover:border-blue-600",
        emerald: "border-emerald-300 bg-emerald-50/60 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-300 dark:hover:border-emerald-600",
    };
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${base}${colours[color]} ${compact ? "gap-1 py-3" : "gap-2 py-6"}`}
        >
            {icon}
            <p className="text-sm font-semibold">{label}</p>
            {!compact && <p className="text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>}
        </button>
    );
}
