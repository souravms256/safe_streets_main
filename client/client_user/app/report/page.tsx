"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import toast from "react-hot-toast";
import { compressImage, needsCompression, blobToFile, getFileSizeMB } from "@/services/imageCompression";

export default function ReportPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setLoading(false);
            },
            (error) => {
                console.error("Error getting location:", error);
                toast.error("Unable to retrieve your location");
                setLoading(false);
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!file || !location) {
            toast.error("Please provide both an image and your location.");
            return;
        }

        setAnalyzing(true);

        // Compress image if needed
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
                headers: {
                    "Content-Type": "multipart/form-data",
                },
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
                        {/* Image Upload */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-white">
                                Capture Evidence
                            </label>

                            {!preview ? (
                                <div className="space-y-3">
                                    {/* Mobile: Two separate buttons */}
                                    <div className="flex gap-3 md:hidden">
                                        <label className="flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 text-center cursor-pointer transition-all active:scale-[0.97] dark:border-blue-800 dark:bg-blue-900/10">
                                            <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Take Photo</span>
                                            <input type="file" className="sr-only" accept="image/*" capture="environment" onChange={handleFileChange} />
                                        </label>
                                        <label className="flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center cursor-pointer transition-all active:scale-[0.97] dark:border-slate-700 dark:bg-slate-900">
                                            <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Gallery</span>
                                            <input type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                    {/* Desktop: Original combined upload area */}
                                    <label
                                        htmlFor="file-upload-desktop"
                                        className="hidden md:flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition-all hover:border-blue-500 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-400 dark:hover:bg-blue-900/10">
                                        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <div className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                            <span className="font-semibold text-blue-600 hover:text-blue-500">Upload a file</span>
                                            <span className="pl-1">or take a photo</span>
                                        </div>
                                        <input id="file-upload-desktop" type="file" className="sr-only" accept="image/*" capture="environment" onChange={handleFileChange} />
                                    </label>
                                </div>
                            ) : (
                                <div className="relative h-48 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                    <Image
                                        src={preview}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFile(null);
                                            setPreview(null);
                                        }}
                                        className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Location */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-white">
                                Location
                            </label>
                            <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                                <div className="flex items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        {location
                                            ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
                                            : "No location detected"
                                        }
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
                        </div>

                        {/* Submit */}
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
