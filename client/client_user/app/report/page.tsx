"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ReportPage() {
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate submission
        setTimeout(() => {
            setLoading(false);
            alert("Report submitted successfully!");
        }, 1500);
    };

    return (
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Submit a Report
                </h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400">
                    Help us keep your community safe by reporting hazards, incidents, or suspicious activity.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
                <div className="space-y-6">
                    <Input
                        label="Report Title"
                        id="title"
                        placeholder="e.g., Broken Streetlight"
                        required
                    />

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Type of Violation
                        </label>
                        <select
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            required
                        >
                            <option value="">Select violation type...</option>
                            <option value="helmetless">Helmetless Driving</option>
                            <option value="no_parking">No Parking Violation</option>
                            <option value="triple_riding">Triple Riding</option>
                            <option value="overspeeding">Overspeeding / Rash Driving</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    {/* Live Capture Section */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
                        <h3 className="mb-2 font-medium text-slate-900 dark:text-white">Live Evidence Capture</h3>
                        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                            Launch camera to auto-detect number plates and violations.
                        </p>
                        <Button type="button" className="w-full flex items-center justify-center gap-2" variant="secondary">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                            </svg>
                            Open Camera for Live Detection
                        </Button>
                    </div>

                    <Input
                        label="Location"
                        id="location"
                        placeholder="e.g., 123 Main St"
                        required
                    />

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Description
                        </label>
                        <textarea
                            rows={4}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                            placeholder="Please describe the incident in detail..."
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Photos (Optional)
                        </label>
                        <div className="flex justify-center rounded-lg border border-dashed border-slate-300 px-6 py-10 dark:border-slate-700">
                            <div className="text-center">
                                <svg
                                    className="mx-auto h-12 w-12 text-slate-300"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <div className="mt-4 flex text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    <label
                                        htmlFor="file-upload"
                                        className="relative cursor-pointer rounded-md bg-transparent font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                                    >
                                        <span>Upload a file</span>
                                        <input
                                            id="file-upload"
                                            name="file-upload"
                                            type="file"
                                            className="sr-only"
                                        />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">
                                    PNG, JPG, GIF up to 10MB
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-x-4">
                    <Button variant="ghost" type="button">
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={loading}>
                        Submit Report
                    </Button>
                </div>
            </form>
        </div>
    );
}
