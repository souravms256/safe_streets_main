"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import {
    Users,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Activity,
    ArrowUpRight,
    Clock,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { TypeChart } from "@/components/dashboard/type-chart";

interface DashboardStats {
    total_users: number;
    total_violations: number;
    pending_violations: number;
    verified_violations: number;
    rejected_violations: number;
}

interface DashboardData {
    message: string;
    stats: DashboardStats;
    recent_activity: any[];
    reports_over_time: { date: string; count: number }[];
    reports_by_type: { name: string; value: number }[];
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get("/admin/dashboard");
                setData(res.data);
            } catch (err) {
                console.error(err);
                setError("Failed to load dashboard data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await api.put(`/admin/violations/${id}/status`, { status });
            if (data) {
                setData({
                    ...data,
                    recent_activity: data.recent_activity.map(v => v.id === id ? { ...v, status } : v),
                    stats: {
                        ...data.stats,
                        pending_violations: status !== 'Under Review' && data.stats.pending_violations > 0 ? data.stats.pending_violations - 1 : data.stats.pending_violations,
                        verified_violations: status === 'Verified' ? data.stats.verified_violations + 1 : data.stats.verified_violations,
                        rejected_violations: status === 'Rejected' ? data.stats.rejected_violations + 1 : data.stats.rejected_violations
                    }
                });
            }
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    <p className="text-gray-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                        <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    const { stats, reports_over_time, reports_by_type } = data!;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
                <p className="text-gray-500 mt-1">System overview and analytics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Violations — Hero */}
                <div className="col-span-2 stat-card p-6 group bg-gradient-to-br from-white/[0.04] to-transparent">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Violations</p>
                            <p className="text-5xl font-bold text-white mt-2 stat-number">{stats.total_violations}</p>
                            <p className="text-sm text-gray-500 mt-2">All-time reports processed</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                    </div>
                </div>

                {/* Pending */}
                <div className="stat-card p-5 group">
                    <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white stat-number">{stats.pending_violations}</p>
                    <p className="text-xs font-medium text-amber-500 mt-1">Pending Review</p>
                </div>

                {/* Users */}
                <div className="stat-card p-5 group">
                    <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Users className="h-4 w-4 text-blue-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white stat-number">{stats.total_users}</p>
                    <p className="text-xs font-medium text-gray-500 mt-1">Active Users</p>
                </div>

                {/* Verified */}
                <div className="stat-card p-5 group">
                    <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            {stats.total_violations > 0 ? Math.round((stats.verified_violations / stats.total_violations) * 100) : 0}%
                        </span>
                    </div>
                    <p className="text-3xl font-bold text-white stat-number">{stats.verified_violations}</p>
                    <p className="text-xs font-medium text-emerald-500 mt-1">Verified</p>
                </div>

                {/* Rejected */}
                <div className="stat-card p-5 group">
                    <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-rose-500/10">
                            <XCircle className="h-4 w-4 text-rose-500" />
                        </div>
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                            {stats.total_violations > 0 ? Math.round((stats.rejected_violations / stats.total_violations) * 100) : 0}%
                        </span>
                    </div>
                    <p className="text-3xl font-bold text-white stat-number">{stats.rejected_violations}</p>
                    <p className="text-xs font-medium text-rose-500 mt-1">Rejected</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 [&>*]:min-w-0">
                {reports_over_time && <AnalyticsChart data={reports_over_time} />}
                {reports_by_type && <TypeChart data={reports_by_type} />}
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 premium-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                        <Link href="/violations" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                            View all
                        </Link>
                    </div>
                    <div className="space-y-1">
                        {data?.recent_activity?.length === 0 ? (
                            <div className="text-center py-8">
                                <Activity className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                <p className="text-gray-500">No recent activity</p>
                            </div>
                        ) : (
                            data?.recent_activity?.map((violation: any, index: number) => (
                                <div
                                    key={violation.id}
                                    className="group flex items-center justify-between py-3 px-4 -mx-4 rounded-xl hover:bg-white/[0.02] transition-colors"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center",
                                            violation.status === 'Verified' && "bg-emerald-500/10",
                                            violation.status === 'Rejected' && "bg-rose-500/10",
                                            violation.status === 'Under Review' && "bg-amber-500/10"
                                        )}>
                                            {violation.status === 'Verified' ? <CheckCircle className="h-5 w-5 text-emerald-500" /> :
                                                violation.status === 'Rejected' ? <XCircle className="h-5 w-5 text-rose-500" /> :
                                                    <Activity className="h-5 w-5 text-amber-500" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-200">{violation.violation_type}</p>
                                            <p className="text-xs text-gray-500">{new Date(violation.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {violation.status === 'Under Review' && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleStatusUpdate(violation.id, 'Verified')}
                                                    className="p-2 hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-500 rounded-lg transition-colors"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(violation.id, 'Rejected')}
                                                    className="p-2 hover:bg-rose-500/10 text-gray-500 hover:text-rose-500 rounded-lg transition-colors"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                        <span className={cn(
                                            "text-xs px-2.5 py-1 rounded-full font-medium",
                                            violation.status === "Verified" && "badge-verified",
                                            violation.status === "Rejected" && "badge-rejected",
                                            violation.status === "Under Review" && "badge-pending"
                                        )}>
                                            {violation.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="premium-card p-6 h-fit">
                    <h2 className="text-lg font-semibold text-white mb-6">Quick Actions</h2>
                    <div className="space-y-3">
                        <Link
                            href="/violations"
                            className="flex items-center justify-between p-4 rounded-xl border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                </div>
                                <span className="text-sm text-gray-300">Review Pending Reports</span>
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </Link>
                        <Link
                            href="/users"
                            className="flex items-center justify-between p-4 rounded-xl border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <Users className="h-4 w-4 text-blue-500" />
                                </div>
                                <span className="text-sm text-gray-300">Manage Users</span>
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
