"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import {
    User,
    Mail,
    Shield,
    Calendar,
    Clock,
    ChevronRight,
    Settings,
    Bell,
    HelpCircle,
    LogOut,
    FileText,
    MapPin,
    Loader2,
} from "lucide-react";

interface UserProfile {
    full_name: string;
    email: string;
    role: string;
    date_of_birth: string;
    created_at: string;
}

export default function ProfilePage() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            router.push("/login");
            return;
        }

        api.get("/users/me")
            .then((res) => setUser(res.data))
            .catch((err) => {
                console.error("Failed to fetch profile:", err);
                if (err.response?.status === 401) router.push("/login");
            })
            .finally(() => setLoading(false));
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
    };

    const initials = user?.full_name
        ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
        : "U";

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
        : "";

    const menuItems = [
        {
            label: "My Reports",
            icon: FileText,
            href: "/dashboard",
            description: "View your submitted reports",
        },
        {
            label: "Violation Map",
            icon: MapPin,
            href: "/map",
            description: "Explore hotspots near you",
        },
    ];

    const supportItems = [
        {
            label: "Notifications",
            icon: Bell,
            description: "Manage alerts & updates",
            onClick: () => { },
        },
        {
            label: "Help & Support",
            icon: HelpCircle,
            description: "FAQs and contact support",
            onClick: () => { },
        },
        {
            label: "Settings",
            icon: Settings,
            description: "Account preferences",
            onClick: () => { },
        },
    ];

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-4">
            {/* Profile Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 pb-12 pt-8 md:pt-12">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/20" />
                    <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10" />
                </div>

                <div className="relative mx-auto max-w-lg">
                    <div className="flex flex-col items-center text-center">
                        {/* Avatar */}
                        <div className="mb-4 flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-white/20 text-white text-2xl md:text-3xl font-black ring-4 ring-white/30 backdrop-blur-sm">
                            {initials}
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-white">
                            {user?.full_name}
                        </h1>
                        <p className="mt-1 text-sm text-blue-200">
                            {user?.email}
                        </p>
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                            <Shield className="h-3 w-3" />
                            {user?.role || "Member"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="mx-auto max-w-lg px-4 -mt-6">
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-white p-3 text-center shadow-lg shadow-slate-200/50 dark:bg-slate-900 dark:shadow-none">
                        <p className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">—</p>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Reports</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-center shadow-lg shadow-slate-200/50 dark:bg-slate-900 dark:shadow-none">
                        <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">—</p>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Verified</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-center shadow-lg shadow-slate-200/50 dark:bg-slate-900 dark:shadow-none">
                        <p className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">{memberSince || "—"}</p>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Since</p>
                    </div>
                </div>
            </div>

            {/* Menu Sections */}
            <div className="mx-auto max-w-lg px-4 mt-6 space-y-4">
                {/* Quick Actions */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    {menuItems.map((item, index) => (
                        <button
                            key={item.label}
                            onClick={() => router.push(item.href)}
                            className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-slate-50 dark:active:bg-slate-800 ${index > 0 ? "border-t border-slate-100 dark:border-slate-800" : ""
                                }`}
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
                                <item.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p>
                                <p className="text-xs text-slate-500">{item.description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                        </button>
                    ))}
                </div>

                {/* Account Info */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">About You</h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        <div className="flex items-center gap-3 px-4 py-3">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <div>
                                <p className="text-xs text-slate-500">Date of Birth</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {user?.date_of_birth
                                        ? new Date(user.date_of_birth).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
                                        : "Not set"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <div>
                                <p className="text-xs text-slate-500">Member Since</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {user?.created_at
                                        ? new Date(user.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
                                        : "—"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Support & Settings */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    {supportItems.map((item, index) => (
                        <button
                            key={item.label}
                            onClick={item.onClick}
                            className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-slate-50 dark:active:bg-slate-800 ${index > 0 ? "border-t border-slate-100 dark:border-slate-800" : ""
                                }`}
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                                <item.icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p>
                                <p className="text-xs text-slate-500">{item.description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                        </button>
                    ))}
                </div>

                {/* Sign Out */}
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 dark:bg-red-900/10 px-4 py-3.5 text-sm font-bold text-red-600 dark:text-red-400 transition-colors active:bg-red-100 dark:active:bg-red-900/20 border border-red-100 dark:border-red-900/30"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </button>

                {/* Version */}
                <p className="text-center text-[10px] text-slate-400 pt-2 pb-4">
                    SafeStreets v1.0.0 · Built for safer communities
                </p>
            </div>
        </div>
    );
}
