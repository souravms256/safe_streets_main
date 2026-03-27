"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, Map, User } from "lucide-react";
import { motion } from "framer-motion";

export default function BottomNav() {
    const pathname = usePathname();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token =
            typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        setIsLoggedIn(!!token);
    }, [pathname]);

    if (!isLoggedIn) return null;
    if (pathname === "/login" || pathname === "/register") return null;

    const isActive = (path: string) => pathname === path;

    const navItems = [
        { name: "Home", href: "/dashboard", icon: Home },
        { name: "Map", href: "/map", icon: Map },
        { name: "Report", href: "/report", icon: FileText },
        { name: "Profile", href: "/profile", icon: User },
    ];

    return (
        <motion.nav
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-0 left-0 right-0 z-[3000] block md:hidden"
        >
            <div
                className="border-t border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/95"
                style={{
                    paddingTop: "10px",
                    paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
                }}
            >
                <div className="grid grid-cols-4 items-center">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="relative flex min-h-[60px] flex-col items-center justify-center gap-1"
                            >
                                <item.icon
                                    className={`h-5 w-5 transition-colors ${
                                        active
                                            ? "text-blue-600 dark:text-blue-500"
                                            : "text-slate-400 dark:text-slate-500"
                                    }`}
                                    strokeWidth={active ? 2.5 : 1.8}
                                />
                                <span
                                    className={`text-[10px] leading-none ${
                                        active
                                            ? "font-bold text-blue-600 dark:text-blue-500"
                                            : "font-medium text-slate-400 dark:text-slate-500"
                                    }`}
                                >
                                    {item.name}
                                </span>
                                {active && (
                                    <motion.span
                                        layoutId="bottomNavIndicator"
                                        className="absolute bottom-0 h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-500"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </motion.nav>
    );
}
