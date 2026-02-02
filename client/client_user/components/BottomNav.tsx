"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, PlusCircle, User } from "lucide-react";

export default function BottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    // Only show on mobile if user is logged in? 
    // Ideally we check auth state or just show public links if not.
    // simpler: show always, adapt links. But for now let's assume logged in mostly or public.

    const navItems = [
        { name: "Home", href: "/dashboard", icon: Home },
        { name: "Map", href: "/map", icon: Map },
        { name: "Report", href: "/report", icon: PlusCircle, isFab: true },
        { name: "Profile", href: "/profile", icon: User },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 block md:hidden">
            <div className="flex items-center justify-around border-t border-slate-200 bg-white/90 px-4 pb-safe pt-2 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/90">
                {navItems.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`flex flex-col items-center gap-1 p-2 transition-colors ${item.isFab
                                ? "-mt-8 rounded-full bg-blue-600 p-4 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30"
                                : isActive(item.href)
                                    ? "text-blue-600 dark:text-blue-500"
                                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                    >
                        <item.icon className={item.isFab ? "h-6 w-6" : "h-5 w-5"} />
                        {!item.isFab && (
                            <span className="text-[10px] font-medium">{item.name}</span>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
