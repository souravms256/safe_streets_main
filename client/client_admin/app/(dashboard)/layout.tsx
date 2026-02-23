"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    AlertTriangle,
    Users,
    LogOut,
    ShieldCheck,
    TrendingUp,
    Activity,
    Settings,
    ChevronRight
} from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [hoveredPath, setHoveredPath] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("admin_access_token");
        if (!token) {
            router.push("/login");
        }
    }, [router]);

    const sidebarItems = [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Violations", href: "/violations", icon: AlertTriangle },
        { name: "Users", href: "/users", icon: Users },
    ];

    const handleLogout = () => {
        localStorage.removeItem("admin_access_token");
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-[#050505] flex selection:bg-blue-500/30">
            {/* Animated Background Mesh */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/5 blur-[120px]" />
            </div>

            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-50 w-72 hidden md:flex flex-col border-r border-white/5 bg-black/60 backdrop-blur-2xl">
                {/* Logo Area */}
                <div className="flex items-center gap-4 px-6 h-24 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold text-white tracking-tight leading-none group-hover:text-blue-100 transition-colors">SafeStreets</span>
                        <span className="text-xs font-medium text-blue-400 mt-1 uppercase tracking-wider">Admin Portal</span>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 py-8 px-4 overflow-y-auto space-y-2">
                    <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Overview</p>
                    <nav className="space-y-1">
                        {sidebarItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onMouseEnter={() => setHoveredPath(item.href)}
                                    onMouseLeave={() => setHoveredPath(null)}
                                    className={cn(
                                        "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                                        isActive
                                            ? "text-white"
                                            : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    {/* Active/Hover Background */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-active"
                                            className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/10 rounded-xl"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    {hoveredPath === item.href && !isActive && (
                                        <motion.div
                                            layoutId="sidebar-hover"
                                            className="absolute inset-0 bg-white/5 rounded-xl"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}

                                    {/* Icon & Text */}
                                    <item.icon className={cn(
                                        "relative z-10 h-5 w-5 transition-colors duration-300",
                                        isActive ? "text-blue-400" : "group-hover:text-blue-400"
                                    )} />
                                    <span className="relative z-10 font-medium">{item.name}</span>

                                    {isActive && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-8 px-4">
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                </div>

                {/* Logout */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group border border-transparent hover:border-white/5"
                    >
                        <div className="flex items-center gap-3">
                            <LogOut className="h-5 w-5 group-hover:text-rose-400 transition-colors" />
                            <span className="font-medium text-sm">Sign Out</span>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-gray-500 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 md:ml-72 relative z-10">
                {/* Mobile Header */}
                <div className="sticky top-0 z-40 flex items-center gap-4 h-16 px-4 border-b border-white/5 bg-black/80 backdrop-blur-xl md:hidden">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                        <ShieldCheck className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-white">SafeStreets</span>
                </div>

                <div className="p-6 lg:p-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
