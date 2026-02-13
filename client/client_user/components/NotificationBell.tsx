"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/services/api";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

const NotificationBell = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const previewNotifications = notifications.slice(0, 3);

    const fetchNotifications = async () => {
        try {
            const res = await api.get("/notifications");
            setNotifications(res.data);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds for new notifications
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
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

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 z-[3000]"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                                    {unreadCount} Unread
                                </span>
                            )}
                        </div>

                        <div className="overflow-y-auto overflow-x-hidden p-2">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                    <div className="mb-3 rounded-full bg-slate-50 p-3 dark:bg-slate-800">
                                        <Bell className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <p className="text-xs font-medium text-slate-500">No notifications yet</p>
                                    <p className="mt-1 text-[10px] text-slate-400">Everything looks clear!</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {previewNotifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => !n.is_read && markAsRead(n.id)}
                                            className={`group relative flex gap-3 rounded-xl p-3 transition-all cursor-pointer ${n.is_read
                                                ? "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                : "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-900/10 dark:hover:bg-blue-900/20"
                                                }`}
                                        >
                                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.type === 'verification' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {n.type === 'verification' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-xs font-bold leading-tight ${n.is_read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                                                        {n.title}
                                                    </p>
                                                    <span className="shrink-0 text-[10px] text-slate-400">
                                                        {timeAgo(n.created_at)}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 line-clamp-2">
                                                    {n.message}
                                                </p>
                                            </div>
                                            {!n.is_read && (
                                                <div className="absolute right-3 bottom-3 h-1.5 w-1.5 rounded-full bg-blue-500" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="border-t border-slate-100 p-2 dark:border-slate-800">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        router.push("/notifications");
                                    }}
                                    className="w-full rounded-lg py-2 text-center text-[10px] font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    View all activity
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;

