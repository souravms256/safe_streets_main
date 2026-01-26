"use client";

import React, { useState } from "react";

interface Detection {
    class: string;
    confidence: number;
    bbox: number[];
}

interface ViolationDetails {
    helmet_violations?: number;
    triple_riding?: boolean;
    rider_count?: number;
    detections?: Detection[];
    output_image?: string;
}

interface Violation {
    id: string;
    image_url: string;
    violation_type: string;
    status: string;
    location: string;
    timestamp: string;
    created_at: string;
    details?: ViolationDetails;
}

interface ViolationsTableProps {
    violations: Violation[];
}

export default function ViolationsTable({ violations }: ViolationsTableProps) {
    const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);

    function openModal(violation: Violation) {
        setSelectedViolation(violation);
    }

    function closeModal() {
        setSelectedViolation(null);
    }

    return (
        <>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-900">
                <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                    <h3 className="text-base font-semibold leading-6 text-slate-900 dark:text-white">
                        Reported Violations
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Proof
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Violation Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Location
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                            {violations.map((violation) => (
                                <tr key={violation.id}>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="h-16 w-16 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                            <img
                                                src={violation.image_url}
                                                alt="Proof"
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {violation.violation_type}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${violation.status === "Verified"
                                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                : violation.status === "Under Review"
                                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                                }`}
                                        >
                                            {violation.status}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                        {violation.location}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                        {new Date(violation.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                        <button
                                            onClick={() => openModal(violation)}
                                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                            title="View Details"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {violations.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                                    >
                                        No violations reported yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedViolation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closeModal}
                    />

                    {/* Modal Content */}
                    <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                AI Detection Details
                            </h3>
                            <button
                                onClick={closeModal}
                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Violation Image */}
                            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                <img
                                    src={selectedViolation.image_url}
                                    alt="Evidence"
                                    className="w-full max-h-[300px] object-contain bg-slate-100 dark:bg-slate-800"
                                />
                            </div>

                            {/* Detection Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Violation Type</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                                        {selectedViolation.violation_type}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                                        {selectedViolation.status}
                                    </p>
                                </div>
                            </div>

                            {/* AI Detection Results */}
                            {selectedViolation.details && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                        AI Analysis Results
                                    </h4>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                {selectedViolation.details.helmet_violations ?? 0}
                                            </p>
                                            <p className="text-xs text-red-500 dark:text-red-400">Helmet Violations</p>
                                        </div>
                                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                                {selectedViolation.details.triple_riding ? "Yes" : "No"}
                                            </p>
                                            <p className="text-xs text-orange-500 dark:text-orange-400">Triple Riding</p>
                                        </div>
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                {selectedViolation.details.rider_count ?? 0}
                                            </p>
                                            <p className="text-xs text-blue-500 dark:text-blue-400">Riders Detected</p>
                                        </div>
                                    </div>

                                    {/* Detections List */}
                                    {selectedViolation.details.detections && selectedViolation.details.detections.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                Objects Detected
                                            </h5>
                                            <div className="space-y-2">
                                                {selectedViolation.details.detections.map((det, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                        <span className={`font-medium ${det.class === 'no-helmet' || det.class === 'no_helmet' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                            {det.class}
                                                        </span>
                                                        <span className="text-sm text-slate-500 dark:text-slate-400">
                                                            {(det.confidence * 100).toFixed(1)}% confidence
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <div>
                                    <strong>Date:</strong> {new Date(selectedViolation.created_at).toLocaleString()}
                                </div>
                                <div>
                                    <strong>Location:</strong> {selectedViolation.location}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
