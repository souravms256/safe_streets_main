"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    AlertTriangle,
    Users,
    Settings,
    LogOut,
    ShieldCheck
} from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        // Basic protection: check if token exists
        const token = localStorage.getItem("admin_access_token");
        if (!token) {
            router.push("/login");
        }
    }, [router]);

    const sidebarItems = [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Violations", href: "/violations", icon: AlertTriangle },
        { name: "Users", href: "/users", icon: Users },
        // { name: "Settings", href: "/settings", icon: Settings },
    ];

    const handleLogout = () => {
        localStorage.removeItem("admin_access_token");
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-50">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hidden md:flex flex-col">
                <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800">
                    <ShieldCheck className="mr-2 h-6 w-6 text-slate-900 dark:text-white" />
                    <span className="text-lg font-bold">SafeStreets Admin</span>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="space-y-1 px-3">
                        {sidebarItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900"
                                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <item.icon className="mr-3 h-5 w-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:pl-64">
                <div className="min-h-full">
                    {/* Header (Mobile mostly) */}
                    <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:hidden">
                        <ShieldCheck className="h-6 w-6" />
                        <span className="font-bold">SafeStreets</span>
                    </div>

                    <div className="p-4 sm:p-6 lg:p-8">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
