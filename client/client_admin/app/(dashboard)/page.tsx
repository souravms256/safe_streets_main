"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertTriangle, CheckCircle, XCircle, Activity, ArrowUpRight } from "lucide-react";
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
            // Optimistic update
            if (data) {
                setData({
                    ...data,
                    recent_activity: data.recent_activity.map(v => v.id === id ? { ...v, status } : v),
                    stats: {
                        ...data.stats,
                        // Simple toggle of counts (approximate for UI feedback)
                        pending_violations: status !== 'Under Review' && data.stats.pending_violations > 0 ? data.stats.pending_violations - 1 : data.stats.pending_violations,
                        verified_violations: status === 'Verified' ? data.stats.verified_violations + 1 : data.stats.verified_violations,
                        rejected_violations: status === 'Rejected' ? data.stats.rejected_violations + 1 : data.stats.rejected_violations
                    }
                });
            }
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update status");
        }
    };

    if (loading) return <div className="p-8 text-gray-500">Loading dashboard...</div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;

    const { stats, reports_over_time, reports_by_type } = data!;

    return (
        <div className="flex flex-col gap-8 py-8">
            <div>
                <h2 className="text-3xl font-semibold tracking-tight text-white">Overview</h2>
                <p className="text-gray-400">System activity and health monitoring.</p>
            </div>

            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="col-span-1 md:col-span-2 bg-black border-gray-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertTriangle className="h-24 w-24 text-white" />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-base font-medium text-gray-400">Total Violations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-5xl font-bold text-white tracking-tight">{stats.total_violations}</div>
                        <p className="text-sm text-gray-500 mt-2">All-time reports processed</p>
                    </CardContent>
                </Card>

                <Card className="bg-black border-gray-800 group hover:border-gray-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Pending Review</CardTitle>
                        <Activity className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.pending_violations}</div>
                        <p className="text-xs text-yellow-500/80 mt-1">Requires action</p>
                    </CardContent>
                </Card>

                <Card className="bg-black border-gray-800 group hover:border-gray-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.total_users}</div>
                        <p className="text-xs text-gray-500 mt-1">Active accounts</p>
                    </CardContent>
                </Card>

                <Card className="bg-black border-gray-800 group hover:border-gray-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Verified</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.verified_violations}</div>
                        <div className="h-1 w-full bg-gray-800 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${stats.total_violations ? (stats.verified_violations / stats.total_violations) * 100 : 0}%` }}></div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-black border-gray-800 group hover:border-gray-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.rejected_violations}</div>
                        <div className="h-1 w-full bg-gray-800 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${stats.total_violations ? (stats.rejected_violations / stats.total_violations) * 100 : 0}%` }}></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Reports Over Time (Line Chart) */}
                {reports_over_time && <AnalyticsChart data={reports_over_time} />}

                {/* Reports by Type (Pie Chart) */}
                {reports_by_type && <TypeChart data={reports_by_type} />}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 bg-black border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {data?.recent_activity?.length === 0 ? (
                                <p className="text-sm text-gray-500">No recent activity.</p>
                            ) : (
                                data?.recent_activity?.map((violation: any) => (
                                    <div key={violation.id} className="group flex items-center justify-between py-3 border-b border-gray-800/50 last:border-0 hover:bg-gray-900/30 px-3 -mx-3 rounded transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800 text-gray-400">
                                                {violation.status === 'Verified' ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                                                    violation.status === 'Rejected' ? <XCircle className="h-4 w-4 text-red-500" /> :
                                                        <Activity className="h-4 w-4 text-yellow-500" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-200">
                                                    {violation.violation_type}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(violation.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {violation.status === 'Under Review' && (
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleStatusUpdate(violation.id, 'Verified')}
                                                        className="p-1 hover:bg-green-500/20 text-green-500 rounded"
                                                        title="Verify"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(violation.id, 'Rejected')}
                                                        className="p-1 hover:bg-red-500/20 text-red-500 rounded"
                                                        title="Reject"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                            <span className={cn(
                                                "text-xs px-2 py-0.5 rounded border",
                                                violation.status === "Verified" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                                    violation.status === "Rejected" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                        "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                            )}>
                                                {violation.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions / Tips */}
                <Card className="bg-black border-gray-800 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Link href="/violations" className="w-full text-left px-4 py-3 rounded border border-gray-800 hover:bg-gray-900 text-sm text-gray-300 transition-colors flex items-center justify-between group">
                            Review Pending Reports
                            <ArrowUpRight className="h-4 w-4 text-gray-600 group-hover:text-white transition-colors" />
                        </Link>
                        <Link href="/users" className="w-full text-left px-4 py-3 rounded border border-gray-800 hover:bg-gray-900 text-sm text-gray-300 transition-colors flex items-center justify-between group">
                            Manage Users
                            <ArrowUpRight className="h-4 w-4 text-gray-600 group-hover:text-white transition-colors" />
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
