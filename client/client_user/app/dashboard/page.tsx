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
                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Total Reports
                        </h3>
                        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                            {violations.length}
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
