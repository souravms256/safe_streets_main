"use client";

/**
 * Pending Uploads — shows all locally-saved reports (status="pending")
 * with thumbnail, timestamp, coordinates, and one-tap upload.
 *
 * Thumbnails are loaded progressively after the list renders, so the
 * page appears instantly with placeholders.
 */

import React, { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import {
    getPendingUploads,
    removePendingReport,
    loadPhotoUrlLocally,
    PendingReport,
    updatePendingReportStatus,
} from "@/services/localDb";
import { uploadPendingReport } from "@/services/reportUpload";
import { MapPin, Clock, Upload, Trash2, ChevronLeft, RefreshCw, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ReportWithThumb = PendingReport & { thumbnailUrl: string };

export default function PendingUploadsPage() {
    const router = useRouter();
    const [reports, setReports] = useState<ReportWithThumb[]>([]);
    const [loading, setLoading] = useState(true);
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const thumbAbortRef = useRef<AbortController | null>(null);

    // ── Load reports + thumbnails ──────────────────────────────────────────────

    const loadReports = useCallback(async () => {
        // Cancel any in-progress thumbnail loading
        thumbAbortRef.current?.abort();
        const abort = new AbortController();
        thumbAbortRef.current = abort;

        setLoading(true);

        try {
            const data = await getPendingUploads();

            // Show cards immediately (no thumbnails yet)
            startTransition(() => {
                setReports(data.map((r) => ({ ...r, thumbnailUrl: "" })));
            });

            // Load thumbnails one-by-one in the background
            for (const report of data) {
                if (abort.signal.aborted) break;
                let url = "";
                if (report.files.length > 0) {
                    try {
                        url = await loadPhotoUrlLocally(report.files[0]);
                    } catch {
                        // non-fatal — placeholder shown instead
                    }
                }
                if (!abort.signal.aborted) {
                    startTransition(() => {
                        setReports((prev) =>
                            prev.map((r) =>
                                r.id === report.id ? { ...r, thumbnailUrl: url } : r
                            )
                        );
                    });
                }
            }
        } catch {
            toast.error("Failed to load pending reports.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadReports();
        return () => {
            thumbAbortRef.current?.abort();
        };
    }, [loadReports]);

    // ── Delete ─────────────────────────────────────────────────────────────────

    const handleDelete = useCallback(async (id: string) => {
        if (!window.confirm("Delete this saved report? This cannot be undone.")) return;
        setDeletingId(id);
        try {
            await removePendingReport(id);
            setReports((prev) => prev.filter((r) => r.id !== id));
            toast.success("Report deleted.");
        } catch {
            toast.error("Delete failed. Try again.");
        } finally {
            setDeletingId(null);
        }
    }, []);

    // ── Upload ─────────────────────────────────────────────────────────────────

    const handleUpload = useCallback(async (report: PendingReport) => {
        setSubmittingId(report.id);
        try {
            const response = await uploadPendingReport(report);
            const { detected_type } = response.data;

            if (report.report_mode === "community_garbage") {
                toast.success("Report submitted successfully!");
            } else {
                toast.success(`Submitted! AI detected: ${detected_type}`);
            }

            await updatePendingReportStatus(report.id, "uploaded");
            setReports((prev) => prev.filter((r) => r.id !== report.id));
        } catch {
            toast.error("Upload failed. Check your connection and try again.");
        } finally {
            setSubmittingId(null);
        }
    }, []);

    // ── Upload all ─────────────────────────────────────────────────────────────

    const handleUploadAll = useCallback(async () => {
        const pending = reports.filter((r) => r.status === "pending");
        if (pending.length === 0) return;

        let successCount = 0;
        let failCount = 0;

        for (const report of pending) {
            setSubmittingId(report.id);
            try {
                const response = await uploadPendingReport(report);
                const { detected_type } = response.data;
                await updatePendingReportStatus(report.id, "uploaded");
                setReports((prev) => prev.filter((r) => r.id !== report.id));
                successCount++;
                if (report.report_mode !== "community_garbage") {
                    toast.success(`AI detected: ${detected_type}`, { duration: 2000 });
                }
            } catch {
                failCount++;
            } finally {
                setSubmittingId(null);
            }
        }

        if (successCount > 0 && failCount === 0) {
            toast.success(`All ${successCount} report(s) uploaded!`);
        } else if (failCount > 0) {
            toast.error(`${failCount} report(s) failed. Try again later.`);
        }
    }, [reports]);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        } catch {
            return iso;
        }
    };

    const formatTime = (iso: string) => {
        try {
            return new Date(iso).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "";
        }
    };

    const anyBusy = submittingId !== null || deletingId !== null;

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">

            {/* Top bar */}
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                <button
                    onClick={() => router.back()}
                    className="-ml-1 rounded-full p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    aria-label="Go back"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className="flex-1 text-lg font-semibold text-slate-900 dark:text-white">
                    Pending Uploads
                    {reports.length > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                            {reports.length}
                        </span>
                    )}
                </h1>
                <button
                    onClick={() => void loadReports()}
                    disabled={loading}
                    className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-40"
                    aria-label="Refresh"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            <div className="mx-auto max-w-2xl px-4 pt-4 space-y-4">

                {/* Upload all button */}
                {reports.length > 1 && (
                    <Button
                        variant="primary"
                        className="w-full gap-2"
                        onClick={() => void handleUploadAll()}
                        disabled={anyBusy}
                        isLoading={anyBusy && submittingId !== null}
                    >
                        <Upload className="h-4 w-4" />
                        Upload All ({reports.length})
                    </Button>
                )}

                {/* List */}
                {loading ? (
                    // Skeleton
                    <div className="space-y-3">
                        {[1, 2].map((i) => (
                            <div
                                key={i}
                                className="flex h-36 animate-pulse overflow-hidden rounded-2xl bg-white dark:bg-slate-900"
                            >
                                <div className="w-32 shrink-0 bg-slate-200 dark:bg-slate-700" />
                                <div className="flex-1 space-y-3 p-4">
                                    <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                                    <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                                    <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                            <Upload className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                        </div>
                        <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">
                            No pending uploads
                        </h3>
                        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                            Saved reports will appear here when you&apos;re offline.
                        </p>
                        <Link href="/report">
                            <Button size="sm">Capture Evidence</Button>
                        </Link>
                    </div>
                ) : (
                    reports.map((report) => (
                        <div
                            key={report.id}
                            className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                            {/* Thumbnail */}
                            <div className="relative w-32 shrink-0 bg-slate-100 dark:bg-slate-800 sm:w-40">
                                {report.thumbnailUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={report.thumbnailUrl}
                                        alt="Evidence thumbnail"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full min-h-[9rem] w-full items-center justify-center">
                                        <ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
                                    </div>
                                )}

                                {/* Offline badge */}
                                <span className="absolute left-2 top-2 rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                                    Saved
                                </span>

                                {/* Time overlay */}
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 backdrop-blur-sm">
                                    <Clock className="h-3 w-3 text-white" />
                                    <span className="text-[10px] font-medium text-white">
                                        {formatTime(report.timestamp)}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex flex-1 flex-col justify-between p-3">
                                <div className="space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">
                                            {report.report_mode === "community_garbage"
                                                ? "Community / Garbage"
                                                : "Traffic Violation"}
                                        </h3>
                                        <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                                            {formatDate(report.timestamp)}
                                        </span>
                                    </div>

                                    <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <span className="line-clamp-1">
                                            {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                                        </span>
                                    </div>

                                    {report.user_violation_type && (
                                        <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                                            <span className="font-medium">Tag:</span>{" "}
                                            {report.user_violation_type}
                                        </p>
                                    )}

                                    {report.severity && (
                                        <span
                                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                report.severity === "High"
                                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    : report.severity === "Medium"
                                                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            }`}
                                        >
                                            {report.severity}
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => void handleDelete(report.id)}
                                        disabled={anyBusy}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-red-500 transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-40 dark:border-slate-700 dark:hover:border-red-800 dark:hover:bg-red-950/30"
                                        aria-label="Delete"
                                    >
                                        {deletingId === report.id ? (
                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                                        ) : (
                                            <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                    <Button
                                        className="flex-1 gap-1.5 text-sm"
                                        size="sm"
                                        onClick={() => void handleUpload(report)}
                                        isLoading={submittingId === report.id}
                                        disabled={anyBusy}
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        Upload Now
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
