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
    address?: string;
    timestamp: string;
    created_at: string;
    details?: ViolationDetails;
}

interface ViolationsTableProps {
    violations: Violation[];
    onDelete?: (id: string) => void;
}

export default function ViolationsTable({ violations, onDelete }: ViolationsTableProps) {
    const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    async function handleDelete(e: React.MouseEvent, id: string) {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this report?")) {
            if (onDelete) {
                setIsDeleting(id);
                try {
                    await onDelete(id);
                } finally {
                    setIsDeleting(null);
                }
            }
        }
    }

    // Reset to page 1 when items per page changes
    const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(violations.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedViolations = violations.slice(startIndex, startIndex + itemsPerPage);

    const handlePrevious = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    function openModal(violation: Violation) {
        setSelectedViolation(violation);
    }

    function closeModal() {
        setSelectedViolation(null);
    }

    return (
        <>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-900">
                <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-base font-semibold leading-6 text-slate-900 dark:text-white">
                        Reported Violations
                    </h3>
                    <div className="flex items-center space-x-2 text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Show</span>
                        <select
                            value={itemsPerPage}
                            onChange={handleLimitChange}
                            className="rounded-md border-slate-300 bg-transparent py-1 pl-2 pr-8 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:text-white"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                        <span className="text-slate-500 dark:text-slate-400">entries</span>
                    </div>
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
                            {paginatedViolations.map((violation) => (
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
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                        <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={violation.address || violation.location}>
                                            {violation.address || violation.location}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                        {new Date(violation.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
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
                                            <button
                                                onClick={(e) => handleDelete(e, violation.id)}
                                                disabled={isDeleting === violation.id}
                                                className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                                                title="Delete Report"
                                            >
                                                {isDeleting === violation.id ? (
                                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {violations.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-6 py-12 text-center"
                                    >
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                </svg>
                                            </div>
                                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                                                No violations found
                                            </div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                                Get started by submitting a new report.
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Footer */}
                {violations.length > 0 && (
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, violations.length)}</span> of <span className="font-medium">{violations.length}</span> results
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={handlePrevious}
                                disabled={currentPage === 1}
                                className="rounded px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Previous
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={currentPage === totalPages}
                                className="rounded px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
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
                                <div className="col-span-2">
                                    <strong>Location:</strong> {selectedViolation.address || selectedViolation.location}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
