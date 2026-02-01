"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CheckCircle,
    XCircle,
    Trash2,
    MapPin,
    Clock,
    MoreHorizontal,
    ExternalLink,
    Download,
    LayoutList,
    Map as MapIcon
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';

const ViolationsMap = dynamic(() => import('@/components/dashboard/violations-map').then(mod => mod.ViolationsMap), {
    ssr: false,
    loading: () => <div className="h-[600px] w-full bg-gray-900 animate-pulse rounded-lg border border-gray-800" />
});

interface Violation {
    id: string;
    violation_type: string;
    image_url: string;
    status: string;
    location: string;
    created_at: string;
    details: any;
    profiles?: {
        full_name: string;
        email: string;
    }
}

export default function ViolationsPage() {
    const [violations, setViolations] = useState<Violation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchViolations = async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/violations");
            setViolations(res.data);
        } catch (error) {
            console.error("Failed to fetch violations", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchViolations();
    }, []);

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await api.put(`/admin/violations/${id}/status`, { status });
            // Optimistic update
            setViolations(violations.map(v => v.id === id ? { ...v, status } : v));
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update status");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this report?")) return;
        try {
            await api.delete(`/admin/violations/${id}`);
            setViolations(violations.filter(v => v.id !== id));
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Failed to delete report");
        }
    };

    const [filterStatus, setFilterStatus] = useState<string>("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<'list' | 'map' | 'heatmap'>('list');

    const filteredViolations = violations.filter(v => {
        const matchesStatus = filterStatus === "All" ||
            (filterStatus === "Pending" ? v.status === "Under Review" : v.status === filterStatus);

        const matchesSearch = v.violation_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesStatus && matchesSearch;
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedViolations = [...filteredViolations].sort((a, b) => {
        if (!sortConfig) return 0;

        let aValue: any = a;
        let bValue: any = b;

        if (sortConfig.key === 'created_at') {
            return sortConfig.direction === 'asc'
                ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }

        if (sortConfig.key === 'profiles.full_name') {
            aValue = a.profiles?.full_name || "";
            bValue = b.profiles?.full_name || "";
        } else if (sortConfig.key === 'status') {
            aValue = a.status;
            bValue = b.status;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedViolations.length / rowsPerPage);
    const paginatedViolations = sortedViolations.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus, searchQuery, rowsPerPage]);

    if (loading) return <div className="p-8 text-gray-500">Loading records...</div>;

    return (
        <div className="flex flex-col gap-8 py-8">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-semibold tracking-tight text-white">Violations</h2>
                        <p className="text-gray-400">Manage and verify reported violations.</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-gray-900 border border-gray-800 p-1 rounded-lg flex gap-1 mr-2">
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'list'
                                        ? "bg-gray-800 text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                                title="List View"
                            >
                                <LayoutList className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'map'
                                        ? "bg-gray-800 text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                                title="Map View"
                            >
                                <MapIcon className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('heatmap')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'heatmap'
                                        ? "bg-gray-800 text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                                title="Heatmap View"
                            >
                                <div className="h-4 w-4 rounded-full bg-gradient-to-tr from-blue-500 via-green-500 to-red-500 opacity-80" />
                            </button>
                        </div>
                        <Button
                            onClick={() => {
                                const headers = ["ID", "Type", "Status", "Date", "Location", "Reporter Name", "Reporter Email"];
                                const csvContent = [
                                    headers.join(","),
                                    ...filteredViolations.map(v => [
                                        v.id,
                                        `"${v.violation_type}"`,
                                        v.status,
                                        new Date(v.created_at).toLocaleDateString(),
                                        `"${v.location.replace(/"/g, '""')}"`,
                                        `"${v.profiles?.full_name || ''}"`,
                                        v.profiles?.email || ''
                                    ].join(","))
                                ].join("\n");

                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement("a");
                                link.href = URL.createObjectURL(blob);
                                link.download = "violations_report.csv";
                                link.click();
                            }}
                            variant="outline"
                            size="sm"
                            className="bg-transparent border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white hover:border-gray-700"
                        >
                            <span className="mr-2">Download CSV</span>
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button onClick={fetchViolations} variant="outline" size="sm" className="bg-transparent border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white hover:border-gray-700">Refresh</Button>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    {/* Status Tabs */}
                    <div className="flex p-1 bg-gray-900/50 border border-gray-800 rounded-lg">
                        {["All", "Pending", "Verified", "Rejected"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                    filterStatus === status
                                        ? "bg-gray-800 text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <input
                        type="text"
                        placeholder="Search violations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-black border border-gray-800 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 w-full sm:w-64"
                    />
                </div>
            </div>

            {viewMode === 'map' || viewMode === 'heatmap' ? (
                <ViolationsMap violations={filteredViolations} showHeatmap={viewMode === 'heatmap'} />
            ) : (
                <div className="rounded-lg border border-gray-800 bg-black overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-900/50 text-xs uppercase text-gray-400 font-medium">
                                <tr className="border-b border-gray-800">
                                    <th className="px-6 py-3">Violation</th>
                                    <th className="px-6 py-3">Location</th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('profiles.full_name')}>
                                        Reporter {sortConfig?.key === 'profiles.full_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('status')}>
                                        Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors text-right" onClick={() => handleSort('created_at')}>
                                        Date {sortConfig?.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {paginatedViolations.map((violation) => (
                                    <tr key={violation.id} className="group hover:bg-gray-900/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                {/* Thumbnail */}
                                                <div className="h-10 w-10 rounded bg-gray-900 border border-gray-800 overflow-hidden flex-shrink-0">
                                                    {violation.image_url ? (
                                                        <img
                                                            src={violation.image_url}
                                                            alt="Evidence"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-gray-600">
                                                            <Clock className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-200">
                                                        {violation.violation_type}
                                                    </div>
                                                </div>
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
                                                    View Map <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {violation.profiles ? (
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-300 text-xs">{violation.profiles.full_name}</span>
                                                    <span className="text-xs text-gray-500">{violation.profiles.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-600 text-xs italic">Unknown</span>
                                            )}
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
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-4">
                                                <div className="text-xs text-gray-500 mr-2">
                                                    {new Date(violation.created_at).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {violation.status !== "Verified" && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(violation.id, "Verified")}
                                                            className="p-1.5 rounded-md hover:bg-green-500/10 text-gray-500 hover:text-green-500 transition-colors"
                                                            title="Verify"
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {violation.status !== "Rejected" && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(violation.id, "Rejected")}
                                                            className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(violation.id)}
                                                        className="p-1.5 rounded-md hover:bg-gray-800 text-gray-600 hover:text-gray-300 transition-colors ml-1"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedViolations.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            No violations found matching criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="border-t border-gray-800 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>Rows per page:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                className="bg-black border border-gray-800 rounded px-2 py-1 focus:outline-none focus:border-gray-600"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
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
                </div>
            )}
        </div>
    );
}
