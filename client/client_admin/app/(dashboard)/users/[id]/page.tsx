"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, FileText, Ban, Lock, ExternalLink } from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [violations, setViolations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const totalPages = Math.ceil(violations.length / rowsPerPage);
    const paginatedViolations = violations.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // Reset page when rowsPerPage changes or id changes
    useEffect(() => {
        setCurrentPage(1);
    }, [rowsPerPage, params.id]);

    useEffect(() => {
        if (!params.id) return;

        const fetchData = async () => {
            try {
                // Fetch user details & stats
                const userRes = await api.get(`/admin/users/${params.id}`);
                setUser(userRes.data.profile);
                setStats(userRes.data.stats);

                // Fetch detailed violations list
                const violationsRes = await api.get(`/admin/users/${params.id}/violations`);
                setViolations(violationsRes.data);
            } catch (err) {
                console.error(err);
                setError("Failed to load user data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [params.id]);

    if (loading) return <div className="p-8">Loading...</div>;
    if (error || !user) return <div className="p-8 text-red-500">{error || "User not found"}</div>;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleDeleteUser = async () => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        try {
            await api.delete(`/admin/users/${user.id}`);
            router.push("/users");
        } catch (error) {
            console.error("Failed to delete user", error);
            alert("Failed to delete user");
        }
    };

    const handleBanUser = async () => {
        const action = user.is_banned ? "unban" : "ban";
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            await api.put(`/admin/users/${user.id}/ban`, { is_banned: !user.is_banned });
            setUser({ ...user, is_banned: !user.is_banned });
        } catch (error) {
            console.error("Failed to update user ban status", error);
            alert("Failed to update user ban status");
        }
    };

    return (
        <div className="flex flex-col gap-8 py-8">
            {/* Navigation & Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/users"
                    className="flex w-fit items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Users</span>
                </Link>
                <div className="flex items-end justify-between border-b border-gray-800 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-semibold tracking-tight text-white">{user.full_name}</h1>
                            {user.is_banned && (
                                <Badge variant="destructive" className="bg-red-500 text-white border-red-600">
                                    BANNED
                                </Badge>
                            )}
                        </div>
                        <p className="text-gray-400">
                            User ID: <span className="font-mono text-xs bg-gray-900 px-1 py-0.5 rounded text-gray-300">{user.id}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBanUser}
                            className={cn(
                                "border",
                                user.is_banned
                                    ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20"
                                    : "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20"
                            )}
                        >
                            {user.is_banned ? (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Unban User
                                </>
                            ) : (
                                <>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Ban User
                                </>
                            )}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteUser}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 border"
                        >
                            Delete User
                        </Button>
                    </div>
                </div>
            </div>

            {/* Profile & Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Info Card */}
                <Card className="bg-black border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-base font-medium text-gray-200">User Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <span className="block text-xs text-gray-500 uppercase tracking-wider">Email</span>
                            <span className="text-sm text-gray-300">{user.email}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500 uppercase tracking-wider">Role</span>
                            <span className="text-sm text-gray-300 capitalize">{user.role}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500 uppercase tracking-wider">Joined On</span>
                            <span className="text-sm text-gray-300">{new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <Card className="bg-black border-gray-800 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base font-medium text-gray-200">Activity Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                            <span className="block text-xs text-gray-500 mb-1">Total Points</span>
                            <span className="text-2xl font-bold text-amber-400">{user.points ?? 0}</span>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                            <span className="block text-xs text-gray-500 mb-1">Total Reports</span>
                            <span className="text-2xl font-bold text-white">{stats.total_reports}</span>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                            <span className="block text-xs text-gray-500 mb-1">Verified</span>
                            <span className="text-2xl font-bold text-white">{stats.verified}</span>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                            <span className="block text-xs text-gray-500 mb-1">Rejected</span>
                            <span className="text-2xl font-bold text-white">{stats.rejected}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Report History */}
            <Card className="bg-black border-gray-800">
                <CardHeader>
                    <CardTitle className="text-base font-medium text-gray-200">Report History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-900/50 text-xs uppercase text-gray-400 font-medium">
                                <tr className="border-b border-gray-800">
                                    <th className="px-6 py-3">Violation</th>
                                    <th className="px-6 py-3">Location</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {paginatedViolations.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            No reports submitted by this user.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedViolations.map((violation) => (
                                        <tr key={violation.id} className="group hover:bg-gray-900/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-8 w-8 rounded bg-gray-900 border border-gray-800 overflow-hidden flex-shrink-0">
                                                        {violation.image_url ? (
                                                            <img
                                                                src={violation.image_url}
                                                                alt="Evidence"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-gray-600">
                                                                <FileText className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-gray-200">
                                                        {violation.violation_type}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-[200px]">
                                                <div className="flex flex-col">
                                                    <span className="truncate text-gray-400 text-xs" title={violation.location}>
                                                        {violation.details?.address || violation.location}
                                                    </span>
                                                    <a
                                                        href={`https://maps.google.com/?q=${violation.location}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 text-xs hover:underline mt-1 inline-flex items-center gap-1"
                                                    >
                                                        Map <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={cn(
                                                    "border-0 px-2 py-0.5 text-xs font-normal",
                                                    violation.status === 'Verified' && "bg-green-500/10 text-green-500",
                                                    violation.status === 'Rejected' && "bg-red-500/10 text-red-500",
                                                    violation.status === 'Under Review' && "bg-yellow-500/10 text-yellow-500"
                                                )}>
                                                    {violation.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-500">
                                                {new Date(violation.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Controls */}
                    {violations.length > 5 && (
                        <div className="border-t border-gray-800 pt-4 mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span>Rows per page:</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                    className="bg-black border border-gray-800 rounded px-2 py-1 focus:outline-none focus:border-gray-600"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-400">
                                    Page {currentPage} of {totalPages || 1}
                                </span>
                                <div className="flex gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="bg-transparent border-gray-800 text-gray-400 hover:text-white disabled:opacity-50"
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage >= totalPages}
                                        className="bg-transparent border-gray-800 text-gray-400 hover:text-white disabled:opacity-50"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
