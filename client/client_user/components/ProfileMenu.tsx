"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import {
    LayoutDashboard,
    Map as MapIcon,
    User as UserIcon,
    LogOut,
    ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileMenuProps {
    user: {
        full_name: string;
        email: string;
        role: string;
    } | null;
}

export default function ProfileMenu({ user }: ProfileMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const toggleMenu = () => setIsOpen(!isOpen);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        try {
            const { removeAuthToken } = await import('@/services/offlineQueue');
            await removeAuthToken();
        } catch (e) {
            console.warn('Failed to remove auth token from IndexedDB', e);
        }
        window.location.href = "/login";
    };

    const initials = user?.full_name
        ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
        : "U";

    const menuItems = [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Map View", href: "/map", icon: MapIcon },
        { label: "Your Profile", href: "/profile", icon: UserIcon },
    ];

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={toggleMenu}
                className="group flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full bg-slate-50 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-700/90 border border-slate-200 dark:border-slate-700/50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
            >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-black shadow-lg shadow-blue-500/20">
                    {initials}
                </div>
                <div className="hidden md:flex flex-col items-start leading-none">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-white mb-0.5">
                        {user?.full_name?.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 capitalize">
                        {user?.role?.toLowerCase() || 'Member'}
                    </span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-3 w-56 origin-top-right rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-[1100]"
                    >
                        {/* Header */}
                        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {user?.full_name}
                            </p>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {user?.email}
                            </p>
                        </div>

                        {/* List - Max height with scroll */}
                        <div className="py-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all mx-1.5 rounded-xl"
                                >
                                    <item.icon className="h-4 w-4 opacity-70" />
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        {/* Logout Section */}
                        <div className="p-1.5 border-t border-slate-100 dark:border-slate-800/60">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-3.5 py-2.5 text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all rounded-xl"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(155, 155, 155, 0.2);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
