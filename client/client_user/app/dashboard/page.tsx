"use client";

import React from "react";
import Link from "next/link";
import api from "@/services/api";
import { Button } from "@/components/ui/Button";
import ViolationsTable from "@/components/ViolationsTable";

export default function DashboardPage() {
    const [user, setUser] = React.useState<{ full_name: string; role: string } | null>(null);
    const [violations, setViolations] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        Promise.all([
            api.get("/users/me"),
            api.get("/violations/")
        ]).then(([userRes, violationsRes]) => {
            setUser(userRes.data);
            setViolations(violationsRes.data);
        })
            .catch((err) => console.error("Failed to fetch dashboard data:", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8">Loading...</div>;

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/violations/${id}`);
            // Optimistically update the UI
            setViolations((prev) => prev.filter((v) => v.id !== id));
        } catch (error) {
            console.error("Failed to delete violation:", error);
            alert("Failed to delete report. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Welcome back, {user?.full_name || "User"}
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
                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                Total Reports
                            </h3>
                            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-900/20 dark:text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                            </span>
                        </div>
                        <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
                            {violations.length}
                        </p>
                    </div>

                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                Verified
                            </h3>
                            <span className="p-2 bg-green-50 text-green-600 rounded-lg dark:bg-green-900/20 dark:text-green-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </span>
                        </div>
                        <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
                            {violations.filter(v => v.status === 'Verified').length}
                        </p>
                    </div>

                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                Pending Review
                            </h3>
                            <span className="p-2 bg-yellow-50 text-yellow-600 rounded-lg dark:bg-yellow-900/20 dark:text-yellow-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </span>
                        </div>
                        <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
                            {violations.filter(v => v.status === 'Under Review').length}
                        </p>
                    </div>
                </div>

                <div className="mt-8">
                    <ViolationsTable violations={violations} onDelete={handleDelete} />
                </div>
            </div>
        </div>
    );
}
