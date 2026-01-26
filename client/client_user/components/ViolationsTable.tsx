"use client";

import React from "react";

interface Violation {
    id: string;
    image_url: string;
    violation_type: string;
    status: string;
    location: string;
    timestamp: string;
    created_at: string;
}

interface ViolationsTableProps {
    violations: Violation[];
}

export default function ViolationsTable({ violations }: ViolationsTableProps) {
    return (
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
                            </tr>
                        ))}
                        {violations.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
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
    );
}
