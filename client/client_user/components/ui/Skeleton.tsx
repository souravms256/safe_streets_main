"use client";

import React from "react";

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 ${className}`}
        />
    );
}

export function StatCardSkeleton() {
    return (
        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <Skeleton className="mt-4 h-8 w-16" />
        </div>
    );
}

export function TableRowSkeleton() {
    return (
        <tr className="border-b border-slate-100 dark:border-slate-800">
            <td className="px-6 py-4">
                <Skeleton className="h-16 w-16 rounded-lg" />
            </td>
            <td className="px-6 py-4">
                <Skeleton className="h-4 w-32" />
            </td>
            <td className="px-6 py-4">
                <Skeleton className="h-6 w-20 rounded-full" />
            </td>
            <td className="px-6 py-4">
                <Skeleton className="h-4 w-40" />
            </td>
            <td className="px-6 py-4">
                <Skeleton className="h-4 w-24" />
            </td>
            <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-5 rounded" />
                </div>
            </td>
        </tr>
    );
}

export function ViolationsTableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-8 w-24" />
            </div>
            {/* Desktop Table Skeleton */}
            <div className="hidden md:block">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            {["Proof", "Violation Type", "Status", "Location", "Date", "Actions"].map((header) => (
                                <th key={header} className="px-6 py-3 text-left">
                                    <Skeleton className="h-3 w-16" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                        {Array.from({ length: rows }).map((_, i) => (
                            <TableRowSkeleton key={i} />
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mobile Card Skeleton */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="p-4">
                        <div className="flex gap-4">
                            <Skeleton className="h-20 w-20 rounded-xl flex-shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                                <Skeleton className="h-3 w-48" />
                                <div className="flex justify-between pt-2">
                                    <Skeleton className="h-3 w-16" />
                                    <div className="flex gap-3">
                                        <Skeleton className="h-3 w-20" />
                                        <Skeleton className="h-3 w-14" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 py-4 sm:py-8 dark:bg-slate-950">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Skeleton className="w-6 h-6 rounded" />
                            <Skeleton className="h-7 w-32" />
                        </div>
                        <Skeleton className="h-4 w-48 mt-2" />
                    </div>
                    <Skeleton className="hidden sm:block h-10 w-32 rounded-lg" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">
                    <div className="col-span-2 md:col-span-1">
                        <StatCardSkeleton />
                    </div>
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                </div>

                {/* Table Section */}
                <div className="mt-8">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <Skeleton className="h-6 w-36" />
                    </div>
                    <ViolationsTableSkeleton rows={5} />
                </div>
            </div>
        </div>
    );
}
