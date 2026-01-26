"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/Button";

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
            alert("Geolocation is not supported by your browser");
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
                alert("Unable to retrieve your location");
                setLoading(false);
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!file || !location) {
            alert("Please provide both an image and your location.");
            return;
        }

        setAnalyzing(true);
        const formData = new FormData();
        formData.append("file", file);
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
            alert(`Report Submitted! AI Detected: ${detected_type}`);
            router.push("/dashboard");

        } catch (error) {
            console.error("Submission failed:", error);
            alert("Failed to submit report. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-lg">
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
                                <div className="flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                                    <div className="text-center">
                                        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <div className="mt-4 flex text-sm leading-6 text-slate-600 dark:text-slate-400">
                                            <label
                                                htmlFor="file-upload"
                                                className="relative cursor-pointer rounded bg-transparent font-semibold text-blue-600 focus-within:outline-none hover:text-blue-500"
                                            >
                                                <span>Upload a file</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" capture="environment" onChange={handleFileChange} />
                                            </label>
                                            <p className="pl-1">or take a photo</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative h-48 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                    <img src={preview} alt="Preview" className="h-full w-full object-cover" />
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
