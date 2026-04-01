"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { getApiErrorMessage } from "@/services/api";
import {
  getPendingReports,
  deletePendingReport,
  initDB,
  updateReportStatus,
  type PendingReport,
} from "@/services/offlineQueue";
import { syncSingleReport, syncPendingReports } from "@/services/offlineSync";

export default function PendingReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<PendingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    void initDB();
    loadReports();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    // Listen for offline sync events
    const handleSyncComplete = () => {
      void loadReports();
    };
    window.addEventListener("offline-sync-complete", handleSyncComplete);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-sync-complete", handleSyncComplete);
    };
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const pending = await getPendingReports();
      setReports(pending.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error("Failed to load pending reports:", error);
      toast.error("Failed to load pending reports");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSingle = async (report: PendingReport) => {
    if (uploadingId || !isOnline) return;

    setUploadingId(report.id);
    try {
      await updateReportStatus(report.id, "pending", undefined, {
        resetRetryCount: true,
        clearLastError: true,
      });
      
      const success = await syncSingleReport(report.id);
      if (success) {
        toast.success("Report submitted and analyzed!");
        await loadReports();
      } else {
        toast.error("Failed to submit report");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(getApiErrorMessage(error));
    } finally {
      setUploadingId(null);
    }
  };

  const handleSync = async () => {
    if (syncing || !isOnline) return;

    setSyncing(true);
    try {
      const { synced, failed } = await syncPendingReports();
      
      if (synced.length > 0) {
        toast.success(`${synced.length} report(s) submitted!`);
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} report(s) failed. You can retry later.`);
      }

      await loadReports();

      if (synced.length === reports.length && failed.length === 0) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (reportId: string) => {
    try {
      await deletePendingReport(reportId);
      toast.success("Report deleted");
      await loadReports();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete report");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 section-space dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Pending Reports
          </h1>
          <button
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ← Back
          </button>
        </div>

        {!isOnline && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/40">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  You&apos;re offline
                </p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  Reports will be submitted automatically once you&apos;re back online.
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="text-slate-500 dark:text-slate-400">
              Loading pending reports...
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white card-comfy text-center dark:border-slate-700 dark:bg-slate-900">
            <svg
              className="mx-auto mb-4 h-14 w-14 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg font-medium text-slate-900 dark:text-white">
              No pending reports
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              All your reports have been submitted successfully!
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {reports.length} report{reports.length !== 1 ? "s" : ""} waiting to be submitted
              </p>
              {isOnline && (
                <Button
                  onClick={handleSync}
                  isLoading={syncing}
                  disabled={syncing || !isOnline}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {syncing ? "Syncing..." : "Sync All"}
                </Button>
              )}
            </div>

      <div className="space-y-6">
              {reports.map((report) => (
        <div key={report.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 card-comfy">
                  {/* Image Preview */}
                  {report.formData.imageUrls && report.formData.imageUrls.length > 0 && (
                    <div className={`grid gap-2 bg-slate-100 p-3 dark:bg-slate-800 ${report.formData.imageUrls!.length === 1 ? '' : 'grid-cols-3'}`}>
                      {report.formData.imageUrls!.map((url, idx) => (
                        <div key={idx} className="relative overflow-hidden rounded-lg" style={{ height: report.formData.imageUrls!.length === 1 ? "200px" : "120px" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={url} 
                            alt={`Report image ${idx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            className="bg-slate-200 dark:bg-slate-700"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Report Details */}
                  <div className="p-4">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {report.formData.report_mode === "community_garbage"
                            ? "🗑️ Garbage Issue"
                            : "🚗 Traffic Violation"}
                        </p>
                        {report.formData.user_violation_type && (
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Tags: {report.formData.user_violation_type}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {new Date(report.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span
                        role="status"
                        aria-live="polite"
                        className={`flex-shrink-0 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          !isOnline
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : report.status === "pending"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : report.status === "retrying"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {!isOnline ? "OFFLINE" : report.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="mb-4 space-y-2 text-sm">
                      <p className="text-slate-600 dark:text-slate-400">
                        📍 <span className="font-mono text-xs">{report.formData.latitude}, {report.formData.longitude}</span>
                      </p>
                      
                      {report.formData.description && (
                        <p className="text-slate-600 dark:text-slate-400">
                          📝 {report.formData.description}
                        </p>
                      )}
                      
                      {report.formData.severity && (
                        <p className="text-slate-600 dark:text-slate-400">
                          ⚠️ Severity: <span className="font-medium capitalize">{report.formData.severity}</span>
                        </p>
                      )}
                      
                      {report.formData.vehicle_number && (
                        <p className="text-slate-600 dark:text-slate-400">
                          � Vehicle: <span className="font-mono font-medium">{report.formData.vehicle_number}</span>
                        </p>
                      )}
                      
                      <p className="text-slate-500 dark:text-slate-500">
                        �📷 {report.formData.imageUrls?.length || 0} image(s)
                      </p>
                    </div>

                    {report.lastError && (
                      <div className="mb-4 rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                        ⚠️ {report.lastError}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {isOnline && (report.status === "pending" || report.status === "failed") && (
                        <button
                          onClick={() => handleUploadSingle(report)}
                          disabled={uploadingId === report.id || !isOnline}
                          aria-label={`Upload report ${new Date(report.timestamp).toLocaleString()}`}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
                        >
                          {uploadingId === report.id ? (
                            <>
                              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Uploading...
                            </>
                          ) : (
                            <>📤 Upload Now</>
                          )}
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(report.id)}
                        aria-label={`Delete report ${new Date(report.timestamp).toLocaleString()}`}
                        className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
