"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/Button";
import ViolationsTable from "@/components/ViolationsTable";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import PullToRefresh from "@/components/PullToRefresh";
import {
    FileText,
    CheckCircle2,
    Clock,
    Plus,
    LayoutDashboard,
    AlertCircle,
    TrendingUp,
    CheckCircle
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
};

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = React.useState<{ full_name: string; role: string } | null>(null);
    const [violations, setViolations] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    const fetchData = React.useCallback(async () => {
        const [userRes, violationsRes] = await Promise.all([
            api.get("/users/me"),
            api.get("/violations/")
        ]);
        setUser(userRes.data);
        setViolations(violationsRes.data);
    }, []);

    React.useEffect(() => {
        fetchData()
            .catch((err) => console.error("Failed to fetch dashboard data:", err))
            .finally(() => setLoading(false));
    }, [fetchData]);

    const handleRefresh = React.useCallback(async () => {
        await fetchData();
    }, [fetchData]);

    if (loading) return <DashboardSkeleton />;

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/violations/${id}`);
            setViolations((prev) => prev.filter((v) => v.id !== id));
        } catch (error) {
            console.error("Failed to delete violation:", error);
            toast.error("Failed to delete report. Please try again.");
        }
    };

    const stats = [
        {
            label: "Total Reports",
            value: violations.length,
            icon: FileText,
            color: "blue"
        },
        {
            label: "Verified",
            value: violations.filter(v => v.status === 'Verified').length,
            icon: CheckCircle2,
            color: "green"
        },
        {
            label: "Pending Review",
            value: violations.filter(v => v.status === 'Under Review').length,
            icon: Clock,
            color: "yellow"
        }
    ];

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="min-h-screen bg-slate-50 py-4 sm:py-8 dark:bg-slate-950">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
                >
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <LayoutDashboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Dashboard
                                </h1>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Welcome back, <span className="font-semibold text-slate-900 dark:text-slate-100">{user?.full_name || "User"}</span>
                            </p>
                        </div>
                        <Link href="/report" className="hidden sm:block">
                            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20">
                                <Plus className="w-4 h-4" />
                                New Report
                            </Button>
                        </Link>
                    </div>

                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3"
                    >
                        {stats.map((stat, index) => (
                            <motion.div
                                key={index}
                                variants={item}
                                whileHover={{ y: -5 }}
                                className={`group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-6 shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all hover:shadow-xl dark:hover:border-slate-700 ${index === 0 ? 'col-span-2 md:col-span-1' : ''}`}
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        {stat.label}
                                    </h3>
                                    <span className={`p-2.5 rounded-xl transition-colors
                                    ${stat.color === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 group-hover:bg-blue-100' : ''}
                                    ${stat.color === 'green' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 group-hover:bg-green-100' : ''}
                                    ${stat.color === 'yellow' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400 group-hover:bg-yellow-100' : ''}
                                `}>
                                        <stat.icon className="w-5 h-5" />
                                    </span>
                                </div>
                                <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
                                    {stat.value}
                                </p>
                                <div className={`absolute bottom-0 left-0 h-1 w-full transition-all scale-x-0 group-hover:scale-x-100
                                ${stat.color === 'blue' ? 'bg-blue-500' : ''}
                                ${stat.color === 'green' ? 'bg-green-500' : ''}
                                ${stat.color === 'yellow' ? 'bg-yellow-500' : ''}
                            `} />
                            </motion.div>
                        ))}
                    </motion.div>

                    {violations.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                        >
                            <EmptyState
                                icon={AlertCircle}
                                title="No reports found"
                                description="Get started by reporting your first traffic violation to help make your community safer."
                                actionLabel="New Report"
                                onAction={() => router.push("/report")}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Reports</h2>
                            </div>
                            <ViolationsTable violations={violations} onDelete={handleDelete} />
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </PullToRefresh>
    );
}
