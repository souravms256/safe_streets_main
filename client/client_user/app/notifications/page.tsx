"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    CheckCheck,
    RefreshCcw,
    Sparkles
} from "lucide-react";
import api from "@/services/api";
import Navbar from "@/components/Navbar";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    const fetchNotifications = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        setRefreshing(true);
        try {
            const res = await api.get("/notifications");
            setNotifications(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch activity:", err);
            setNotifications([]);
        } finally {
            setLoading(false);
            // Artificial delay for smooth animation
            setTimeout(() => setRefreshing(false), 600);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        const token = localStorage.getItem("access_token");
        if (!token) {
            router.push("/login");
            return;
        }
        fetchNotifications(true);

        // Auto-refresh every 60 seconds
        const interval = setInterval(() => fetchNotifications(false), 60000);
        return () => clearInterval(interval);
    }, [router, fetchNotifications]);

    // Handle visibility change to refresh
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchNotifications(false);
            }
        };
        window.addEventListener('visibilitychange', handleVisibilityChange);
        return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [fetchNotifications]);

    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter((n) => !n.is_read);
        if (unread.length === 0) return;
        try {
            await Promise.all(unread.map((n) => api.put(`/notifications/${n.id}/read`)));
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, is_read: true }))
            );
        } catch (err) {
            console.error("Failed to mark all read:", err);
        }
    };

    const timeAgo = (dateString: string) => {
        const now = new Date();
        const past = new Date(dateString);
        const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

        if (diffInSeconds < 60) return "Just now";
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!mounted) return null;

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const filteredNotifications = notifications.filter((n) => {
        if (filter === "unread") return !n.is_read;
        if (filter === "read") return n.is_read;
        return true;
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <Navbar />
            <div className="mx-auto max-w-2xl px-4 pt-24 pb-20">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors mb-6"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Back to dashboard
                    </button>

                    <div className="flex items-end justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Activity
                                </h1>
                                {unreadCount > 0 && (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white shadow-lg shadow-blue-500/30">
                                        {unreadCount}
                                    </div>
                                )}
                            </div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                {unreadCount > 0
                                    ? `Stay updated with your latest reports and alerts.`
                                    : "You've read all your recent notifications."}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchNotifications(false)}
                                disabled={refreshing}
                                title="Refresh activity"
                                className={`flex items-center justify-center h-10 w-10 rounded-2xl bg-white border border-slate-200 text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95 disabled:opacity-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50 ${refreshing ? 'cursor-not-allowed' : ''}`}
                            >
                                <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>

                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="flex items-center h-10 gap-2 rounded-2xl bg-slate-900 px-5 text-xs font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-black hover:-translate-y-0.5 active:translate-y-0 dark:bg-blue-600 dark:hover:bg-blue-500 dark:shadow-blue-500/20"
                                >
                                    <CheckCheck className="h-4 w-4" />
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="mb-8 flex gap-1.5 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5">
                    {(["all", "unread", "read"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 rounded-xl py-2.5 text-xs font-bold capitalize transition-all ${filter === f
                                ? "bg-white text-slate-900 shadow-md dark:bg-slate-800 dark:text-white"
                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Notifications List */}
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="animate-pulse rounded-3xl bg-white p-6 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-black">
                                <div className="flex gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                                    <div className="flex-1 space-y-4">
                                        <div className="h-4 w-1/3 rounded bg-slate-100 dark:bg-slate-800" />
                                        <div className="space-y-2">
                                            <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                                            <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center rounded-[2.5rem] bg-white border border-slate-100 py-24 px-8 text-center shadow-sm dark:bg-slate-900/50 dark:border-white/5"
                    >
                        <div className="relative mb-6">
                            <div className="absolute -inset-4 rounded-full bg-blue-100/50 dark:bg-blue-900/20 blur-xl animate-pulse" />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                                <Sparkles className="h-10 w-10 text-blue-500 dark:text-blue-400" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            {filter === "all" ? "A clean slate!" : `No ${filter} found`}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed">
                            {filter === "all"
                                ? "When something happens in your neighborhood, we'll let you know."
                                : "You're all caught up with this specific category."}
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {filteredNotifications.map((n) => (
                                <motion.div
                                    key={n.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => !n.is_read && markAsRead(n.id)}
                                    className={`group relative flex gap-4 rounded-[2rem] p-6 transition-all cursor-pointer border shadow-sm ${n.is_read
                                        ? "bg-white border-slate-100 hover:border-blue-200 hover:shadow-lg dark:bg-slate-900 dark:border-white/5 dark:hover:border-blue-900/50"
                                        : "bg-blue-50/30 border-blue-100 hover:bg-blue-50/50 hover:border-blue-200 hover:shadow-lg dark:bg-blue-900/10 dark:border-blue-900/30 dark:hover:bg-blue-900/20"
                                        }`}
                                >
                                    <div
                                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner transition-colors ${n.type === "verification"
                                            ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                            }`}
                                    >
                                        {n.type === "verification" ? (
                                            <CheckCircle2 className="h-7 w-7" />
                                        ) : (
                                            <AlertCircle className="h-7 w-7" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h4
                                                className={`text-base font-bold transition-colors ${n.is_read
                                                    ? "text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                                    : "text-slate-900 dark:text-white group-hover:text-blue-600"
                                                    }`}
                                            >
                                                {n.title}
                                            </h4>
                                            <span className="shrink-0 text-xs font-semibold text-slate-400 tabular-nums">
                                                {timeAgo(n.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                                            {n.message}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                {formatDate(n.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                    {!n.is_read && (
                                        <div className="absolute right-6 top-6 h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
