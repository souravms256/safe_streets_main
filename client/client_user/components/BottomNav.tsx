"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, PlusCircle, User } from "lucide-react";
import { motion } from "framer-motion";

export default function BottomNav() {
    const pathname = usePathname();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        setIsLoggedIn(!!token);
    }, [pathname]);

    // Don't render on auth pages or when not logged in
    if (!isLoggedIn) return null;
    if (pathname === "/login" || pathname === "/register") return null;

    const isActive = (path: string) => pathname === path;

    const navItems = [
        { name: "Home", href: "/dashboard", icon: Home },
        { name: "Map", href: "/map", icon: Map },
        { name: "Report", href: "/report", icon: PlusCircle, isFab: true },
        { name: "Profile", href: "/profile", icon: User },
    ];

    return (
        <motion.nav
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-0 left-0 right-0 z-[3000] block md:hidden"
        >
            <div className="flex items-center justify-around border-t border-slate-200/80 bg-white/95 px-2 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/95"
                style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)", paddingTop: "8px" }}>
        {navItems.map((item) => {
            const active = isActive(item.href);
            return (
                <Link
                    key={item.name}
                    href={item.href}
                    className="relative flex flex-col items-center gap-0.5"
                >
                    <motion.div
                        whileTap={{ scale: 0.9 }}
                        className={`flex flex-col items-center transition-all ${item.isFab
                            ? "-translate-y-5 rounded-full bg-blue-600 p-3.5 text-white shadow-lg shadow-blue-500/30 border-4 border-white dark:border-slate-900"
                            : active
                                ? "text-blue-600 dark:text-blue-500"
                                : "text-slate-400 dark:text-slate-500"
                            }`}
                    >
                        <item.icon className={item.isFab ? "h-6 w-6" : "h-5 w-5"} strokeWidth={active && !item.isFab ? 2.5 : 1.5} />
                        {!item.isFab && (
                            <span className={`text-[10px] leading-tight ${active ? "font-bold" : "font-medium"}`}>
                                {item.name}
                            </span>
                        )}
                    </motion.div>

                            {/* Active indicator dot */}
                            {!item.isFab && active && (
                                <motion.span
                                    layoutId="bottomNavIndicator"
                                    className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-500"
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </motion.nav>
    );
}
