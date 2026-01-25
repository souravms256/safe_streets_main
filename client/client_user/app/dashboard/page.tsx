import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

// Mock data
const recentReports = [
    {
        id: 1,
        title: "Helmetless Rider",
        location: "Main St & 5th Ave",
        status: "Pending",
        date: "2023-10-25",
    },
    {
        id: 2,
        title: "No Parking Violation",
        location: "Elm Street - Bus Stop",
        status: "Resolved",
        date: "2023-10-20",
    },
    {
        id: 3,
        title: "Triple Riding",
        location: "Central Park West",
        status: "Reported",
        date: "2023-10-24",
    },
];

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Welcome back, User
                        </p>
                    </div>
                    <Link href="/report">
                        <Button>
                            + New Report
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Stats Cards */}
                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Total Reports
                        </h3>
                        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                            12
                        </p>
                    </div>
                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Pending Review
                        </h3>
                        <p className="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-500">
                            3
                        </p>
                    </div>
                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Resolved
                        </h3>
                        <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-500">
                            9
                        </p>
                    </div>

                    {/* Recent Reports List */}
                    <div className="col-span-1 md:col-span-3">
                        <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-900">
                            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                                <h3 className="text-base font-semibold leading-6 text-slate-900 dark:text-white">
                                    Recent Activity
                                </h3>
                            </div>
                            <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-800">
                                {recentReports.map((report) => (
                                    <li key={report.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <div className="flex items-center justify-between px-6 py-4">
                                            <div>
                                                <p className="truncate text-sm font-medium text-blue-600 dark:text-blue-400">
                                                    {report.title}
                                                </p>
                                                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                                                    {report.location}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${report.status === "Resolved"
                                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                        : report.status === "Pending"
                                                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                                        }`}
                                                >
                                                    {report.status}
                                                </span>
                                                <time className="text-xs text-slate-400">
                                                    {report.date}
                                                </time>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
