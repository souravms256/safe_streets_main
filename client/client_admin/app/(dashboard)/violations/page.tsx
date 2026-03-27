"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";

import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import {
    CheckCircle,
    XCircle,
    Trash2,
    MapPin,

    LayoutList,
    Map as MapIcon,
    Search,

    Image as ImageIcon,
    X,
    Maximize2,
    MessageSquare,
    Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from "framer-motion";

const ViolationsMap = dynamic(() => import('@/components/dashboard/violations-map').then(mod => mod.ViolationsMap), {
    ssr: false,
    loading: () => <div className="h-[600px] w-full bg-gray-900/50 animate-pulse rounded-2xl border border-gray-800" />
});

interface Violation {
    id: string;
    violation_type: string;
    image_url: string;
    status: string;
    location: string;
    created_at: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details: any;
    profiles?: {
        full_name: string;
        email: string;
    }
}

export default function ViolationsPage() {
    const [violations, setViolations] = useState<Violation[]>([]);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'list' | 'map' | 'heatmap'>('list');
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [reviewViolation, setReviewViolation] = useState<Violation | null>(null);
    const [adminComment, setAdminComment] = useState("");
    const rowsPerPage = 10;
    const statusFilters = [
        { label: "All", value: "All" },
        { label: "Pending", value: "Under Review" },
        { label: "Verified", value: "Verified" },
        { label: "Rejected", value: "Rejected" },
    ] as const;
    const isCommunityReview =
        reviewViolation?.details?.report_mode === "community_garbage" ||
        reviewViolation?.details?.detector_source === "user_reported";

    const fetchViolations = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/violations");
            const violationsData = res.data.data || res.data;
            setViolations(Array.isArray(violationsData) ? violationsData : []);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Failed to fetch violations", error);
            const errorMsg = error.response?.data?.detail || "Failed to load violations";
            setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
            setViolations([]);
            toast.error("Failed to load violations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchViolations();
    }, []);

    // Filter Logic
    const filteredViolations = violations.filter(v => {
        const matchesStatus =
            filterStatus === "All" ||
            v.status === filterStatus ||
            (filterStatus === "Under Review" && (!v.status || v.status === "Pending"));
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            v.violation_type.toLowerCase().includes(searchLower) ||
            v.location.toLowerCase().includes(searchLower) ||
            v.profiles?.full_name?.toLowerCase().includes(searchLower);
        return matchesStatus && matchesSearch;
    });

    const sortedViolations = [...filteredViolations].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const paginatedViolations = sortedViolations.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const handleStatusUpdate = async (id: string, status: string, comment?: string) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const payload: any = { status };
            if (comment) payload.admin_comments = comment;
            await api.put(`/admin/violations/${id}/status`, payload);
            setViolations(violations.map(v => v.id === id ? { ...v, status } : v));
            toast.success(`Violation marked as ${status}`);
            setReviewViolation(null);
            setAdminComment("");
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this violation?")) return;
        try {
            await api.delete(`/admin/violations/${id}`);
            setViolations(violations.filter(v => v.id !== id));
            toast.success("Violation deleted");
        } catch (error) {
            console.error("Failed to delete violation", error);
            toast.error("Failed to delete violation");
        }
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleBulkAction = async (action: 'verify' | 'reject' | 'delete') => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        try {
            if (action === 'delete') {
                if (!confirm(`Delete ${ids.length} violations permanently?`)) return;
                const res = await api.delete('/admin/violations/bulk', { data: { ids } });
                setViolations(prev => prev.filter(v => !selectedIds.has(v.id)));
                toast.success(`Deleted ${res.data.success} violations`);
            } else {
                const status = action === 'verify' ? 'Verified' : 'Rejected';
                const res = await api.put('/admin/violations/bulk-status', { ids, status });
                setViolations(prev => prev.map(v => selectedIds.has(v.id) ? { ...v, status } : v));
                toast.success(`${res.data.success} violations ${action === 'verify' ? 'verified' : 'rejected'}`);
            }
        } catch (error) {
            console.error(`Bulk ${action} failed`, error);
            toast.error(`Bulk ${action} failed`);
        }

        setSelectedIds(new Set());
    };

    // Table Skeleton
    const TableSkeleton = () => (
        <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 animate-pulse border border-white/5">
                    <div className="w-6 h-6 rounded bg-white/10" />
                    <div className="w-16 h-12 rounded bg-white/10" />
                    <div className="w-32 h-6 rounded bg-white/10" />
                    <div className="flex-1 h-6 rounded bg-white/10" />
                    <div className="w-20 h-6 rounded bg-white/10" />
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Violations</h1>
                    <p className="text-gray-500 mt-1">Manage and verify reported violations</p>
                </div>

                <div className="flex items-center bg-gray-900/50 p-1 rounded-xl border border-white/10 backdrop-blur-sm">
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            viewMode === 'list' ? "bg-blue-500/20 text-blue-400 shadow-sm" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <LayoutList className="h-4 w-4" />
                        List
                    </button>
                    <button
                        onClick={() => setViewMode('map')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            viewMode === 'map' ? "bg-blue-500/20 text-blue-400 shadow-sm" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <MapIcon className="h-4 w-4" />
                        Map
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center premium-card p-2 rounded-xl">
                <div className="flex gap-1 overflow-x-auto w-full md:w-auto p-1">
                    {statusFilters.map((status) => (
                        <button
                            key={status.value}
                            onClick={() => setFilterStatus(status.value)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                                filterStatus === status.value
                                    ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search violations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                    />
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <TableSkeleton />
            ) : viewMode === 'list' ? (
                <div className="premium-card overflow-hidden border border-white/5 rounded-2xl bg-black/40 backdrop-blur-xl">
                    {/* Bulk Actions Header */}
                    {selectedIds.size > 0 && (
                        <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-4 flex items-center justify-between">
                            <span className="text-sm text-blue-400 font-medium">
                                {selectedIds.size} selected
                            </span>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleBulkAction('verify')} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0">
                                    Verify All
                                </Button>
                                <Button size="sm" onClick={() => handleBulkAction('reject')} className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border-0">
                                    Reject All
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-4 py-3 w-10">
                                        <div
                                            className={cn(
                                                "w-4 h-4 rounded border cursor-pointer transition-colors",
                                                filteredViolations.length > 0 && selectedIds.size === filteredViolations.length
                                                    ? "bg-blue-500 border-blue-500"
                                                    : "border-gray-600 hover:border-gray-400"
                                            )}
                                            onClick={() => {
                                                if (selectedIds.size === filteredViolations.length) setSelectedIds(new Set());
                                                else setSelectedIds(new Set(filteredViolations.map(v => v.id)));
                                            }}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Violation</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reporter</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <AnimatePresence mode="popLayout">
                                    {paginatedViolations.length === 0 ? (
                                        <motion.tr
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <td colSpan={8} className="p-12 text-center">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center">
                                                        <Search className="h-8 w-8 text-gray-600" />
                                                    </div>
                                                    <p className="text-gray-400 font-medium">No violations found</p>
                                                    <p className="text-gray-600 text-sm">Try adjusting your filters</p>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ) : (
                                        paginatedViolations.map((violation, index) => (
                                            <motion.tr
                                                key={violation.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                                className="group hover:bg-white/[0.02] transition-colors"
                                            >
                                                <td className="px-4 py-3">
                                                    <div
                                                        className={cn(
                                                            "w-4 h-4 rounded border cursor-pointer transition-colors",
                                                            selectedIds.has(violation.id)
                                                                ? "bg-blue-500 border-blue-500"
                                                                : "border-gray-600 group-hover:border-gray-500"
                                                        )}
                                                        onClick={() => toggleSelection(violation.id)}
                                                    />
                                                </td>
                                                {/* Image Preview Column */}
                                                <td className="px-4 py-3">
                                                    <div
                                                        className="relative w-16 h-12 rounded-lg overflow-hidden bg-gray-800 border border-white/10 group-hover:border-blue-500/50 transition-colors cursor-zoom-in group/image"
                                                        onClick={() => setPreviewImage(violation.image_url)}
                                                    >
                                                        {violation.image_url ? (
                                                            <div
                                                                className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover/image:scale-110"
                                                                style={{ backgroundImage: `url(${violation.image_url})` }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                                <ImageIcon className="h-5 w-5" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors flex items-center justify-center">
                                                            <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover/image:opacity-100 transition-opacity" />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col max-w-[140px]">
                                                        <span className="font-medium text-gray-200 truncate" title={violation.violation_type}>{violation.violation_type}</span>
                                                        <span className="text-xs text-gray-500 truncate font-mono">{violation.id.substring(0, 8)}...</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2 text-gray-400 max-w-[120px]">
                                                        <MapPin className="h-3 w-3 text-gray-500 shrink-0" />
                                                        <span className="text-sm truncate" title={violation.location || "Unknown"}>{violation.location || "Unknown"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col max-w-[120px]">
                                                        <span className="text-sm text-gray-300 truncate" title={violation.profiles?.full_name || "Anonymous"}>{violation.profiles?.full_name || "Anonymous"}</span>
                                                        <span className="text-xs text-gray-600 truncate" title={violation.profiles?.email}>{violation.profiles?.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap",
                                                        violation.status === 'Verified' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                                        violation.status === 'Rejected' && "bg-rose-500/10 text-rose-400 border-rose-500/20",
                                                        violation.status === 'Under Review' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                                                        (!violation.status || violation.status === 'Pending') && "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                    )}>
                                                        {violation.status || 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm text-gray-400 whitespace-nowrap">
                                                    {new Date(violation.created_at).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => { setReviewViolation(violation); setAdminComment(""); }}
                                                            className="p-1.5 rounded-lg hover:bg-blue-500/20 text-gray-500 hover:text-blue-400 transition-colors"
                                                            title="Review"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        {violation.status !== "Verified" && (
                                                            <button
                                                                onClick={() => handleStatusUpdate(violation.id, "Verified")}
                                                                className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-gray-500 hover:text-emerald-400 transition-colors"
                                                                title="Verify"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {violation.status !== "Rejected" && (
                                                            <button
                                                                onClick={() => handleStatusUpdate(violation.id, "Rejected")}
                                                                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 transition-colors"
                                                                title="Reject"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(violation.id)}
                                                            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-600 hover:text-gray-300 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="border-t border-white/5 px-6 py-4 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            Page {currentPage} of {Math.ceil(sortedViolations.length / rowsPerPage) || 1}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(c => c - 1)}
                                className="bg-transparent border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= Math.ceil(sortedViolations.length / rowsPerPage)}
                                onClick={() => setCurrentPage(c => c + 1)}
                                className="bg-transparent border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <ViolationsMap violations={filteredViolations} showHeatmap={viewMode === 'heatmap'} />
            )}

            {/* Image Preview Modal */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setPreviewImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="relative max-w-4xl max-h-[90vh] w-full bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 p-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            <div className="w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                                <img
                                    src={previewImage}
                                    alt="Evidence"
                                    className="max-w-full max-h-[85vh] object-contain"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Review Detail Modal */}
            <AnimatePresence>
                {reviewViolation && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => { setReviewViolation(null); setAdminComment(""); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 rounded-2xl shadow-2xl border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Review Violation</h3>
                                    <p className="text-sm text-gray-500 mt-0.5 font-mono">{reviewViolation.id.substring(0, 12)}...</p>
                                </div>
                                <button
                                    onClick={() => { setReviewViolation(null); setAdminComment(""); }}
                                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Evidence Image */}
                                <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                                    {reviewViolation.image_url ? (
                                        <img
                                            src={reviewViolation.image_url}
                                            alt="Evidence"
                                            className="w-full h-auto max-h-80 object-contain"
                                        />
                                    ) : (
                                        <div className="h-48 flex items-center justify-center text-gray-600">
                                            <ImageIcon className="h-12 w-12" />
                                        </div>
                                    )}
                                </div>

                                {/* Status & AI Detection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {isCommunityReview ? "Report Type" : "AI Detection"}
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-white">{reviewViolation.violation_type}</p>
                                        {isCommunityReview && (
                                            <p className="mt-1 text-xs text-emerald-400">
                                                User-reported community garbage issue
                                            </p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Status</p>
                                        <span className={cn(
                                            "mt-1 inline-block px-2.5 py-1 rounded-full text-xs font-medium border",
                                            reviewViolation.status === 'Verified' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                            reviewViolation.status === 'Rejected' && "bg-rose-500/10 text-rose-400 border-rose-500/20",
                                            reviewViolation.status === 'Under Review' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                                        )}>
                                            {reviewViolation.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Reporter Info */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-blue-400" />
                                        Report Info
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                            <p className="text-xs text-gray-500">Reporter</p>
                                            <p className="text-sm text-gray-200 font-medium mt-0.5">{reviewViolation.profiles?.full_name || "Anonymous"}</p>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                            <p className="text-xs text-gray-500">Location</p>
                                            <p className="text-sm text-gray-200 mt-0.5">{reviewViolation.details?.short_address || reviewViolation.location}</p>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                            <p className="text-xs text-gray-500">Date</p>
                                            <p className="text-sm text-gray-200 mt-0.5">{new Date(reviewViolation.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* User-Provided Details */}
                                {(reviewViolation.details?.user_violation_type || reviewViolation.details?.description || reviewViolation.details?.severity || reviewViolation.details?.vehicle_number) && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4 text-purple-400" />
                                            Reporter&apos;s Details
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {reviewViolation.details?.user_violation_type && (
                                                <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/10">
                                                    <p className="text-xs text-gray-500">Reported Type</p>
                                                    <p className="text-sm text-purple-300 font-medium mt-0.5">{reviewViolation.details.user_violation_type}</p>
                                                </div>
                                            )}
                                            {reviewViolation.details?.severity && (
                                                <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/10">
                                                    <p className="text-xs text-gray-500">Severity</p>
                                                    <p className={`text-sm font-medium mt-0.5 ${
                                                        reviewViolation.details.severity === 'High' ? 'text-red-400' :
                                                        reviewViolation.details.severity === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                                                    }`}>{reviewViolation.details.severity}</p>
                                                </div>
                                            )}
                                            {reviewViolation.details?.vehicle_number && (
                                                <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/10">
                                                    <p className="text-xs text-gray-500">Vehicle Number</p>
                                                    <p className="text-sm text-white font-bold tracking-wider mt-0.5">{reviewViolation.details.vehicle_number}</p>
                                                </div>
                                            )}
                                        </div>
                                        {reviewViolation.details?.description && (
                                            <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/10">
                                                <p className="text-xs text-gray-500 mb-1">Description</p>
                                                <p className="text-sm text-gray-300 leading-relaxed">{reviewViolation.details.description}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Admin Comment Input */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-blue-400" />
                                        Your Comment
                                    </label>
                                    <textarea
                                        value={adminComment}
                                        onChange={(e) => setAdminComment(e.target.value)}
                                        placeholder="Add feedback for the reporter (optional)..."
                                        rows={3}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all resize-none"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    {reviewViolation.status !== "Verified" && (
                                        <button
                                            onClick={() => handleStatusUpdate(reviewViolation.id, "Verified", adminComment || undefined)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20 font-medium text-sm transition-all"
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                            Verify Report
                                        </button>
                                    )}
                                    {reviewViolation.status !== "Rejected" && (
                                        <button
                                            onClick={() => handleStatusUpdate(reviewViolation.id, "Rejected", adminComment || undefined)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/20 font-medium text-sm transition-all"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            Reject Report
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
