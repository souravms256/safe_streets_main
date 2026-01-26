"use client";

import React, { useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, EyeIcon } from "@heroicons/react/24/outline";

interface Violation {
    id: string;
    image_url: string;
    violation_type: string;
    status: string;
    location: string;
    timestamp: string;
    created_at: string;
    details?: any;
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
                                            className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
                                        >
                                            <EyeIcon className="h-5 w-5" aria-hidden="true" />
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

            <Transition appear show={!!selectedViolation} as={React.Fragment}>
                <Dialog as="div" className="relative z-10" onClose={closeModal}>
                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-slate-900">
                                    <div className="flex items-center justify-between">
                                        <Dialog.Title
                                            as="h3"
                                            className="text-lg font-medium leading-6 text-slate-900 dark:text-white"
                                        >
                                            Violation Details
                                        </Dialog.Title>
                                        <button
                                            onClick={closeModal}
                                            className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            <XMarkIcon className="h-5 w-5 text-slate-500" />
                                        </button>
                                    </div>

                                    {selectedViolation && (
                                        <div className="mt-4 space-y-4">
                                            {/* Image */}
                                            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                                <img
                                                    src={selectedViolation.image_url}
                                                    alt="Evidence"
                                                    className="w-full object-contain max-h-[400px]"
                                                />
                                            </div>

                                            {/* Details JSON */}
                                            <div>
                                                <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                                                    AI Detection Results
                                                </h4>
                                                <div className="mt-2 rounded-lg bg-slate-50 p-4 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 overflow-x-auto">
                                                    <pre>{JSON.stringify(selectedViolation.details || {}, null, 2)}</pre>
                                                </div>
                                            </div>

                                            {/* Metadata */}
                                            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
                                                <div>
                                                    <strong>Date:</strong> {new Date(selectedViolation.created_at).toLocaleString()}
                                                </div>
                                                <div>
                                                    <strong>Location:</strong> {selectedViolation.location}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
}
