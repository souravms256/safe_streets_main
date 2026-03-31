"use client";

import React, { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./ui/Button";
import ProfileMenu from "./ProfileMenu";
import NotificationBell from "./NotificationBell";
import api from "@/services/api";
import { APP_ROUTES, AUTH_CHANGE_EVENT, emitAuthChange, getAccessToken } from "@/services/appShell";
import { 
    Menu, X, Home, Info, Mail, LayoutDashboard, 
    Map as MapIcon, Trophy, LogIn, UserPlus, 
    LogOut, User as UserIcon 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
}

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
        emitAuthChange();
        setIsOpen(false);
        startTransition(() => {
            router.replace("/login");
        });
    };

    useEffect(() => {
        let isMounted = true;

        const loadUser = async () => {
            const token = getAccessToken();

            if (!token) {
                if (isMounted) {
                    setUser(null);
                    setIsAuthReady(true);
                }
                return;
            }

            try {
                const res = await api.get("/users/me");
                if (isMounted) {
                    setUser(res.data);
                }
            } catch {
                if (isMounted) {
                    setUser(null);
                }
            } finally {
                if (isMounted) {
                    setIsAuthReady(true);
                }
            }
        };

        const syncUser = () => {
            setUser(null);
            setIsAuthReady(false);
            void loadUser();
        };

        void loadUser();
        window.addEventListener("storage", syncUser);
        window.addEventListener(AUTH_CHANGE_EVENT, syncUser);

        return () => {
            isMounted = false;
            window.removeEventListener("storage", syncUser);
            window.removeEventListener(AUTH_CHANGE_EVENT, syncUser);
        };
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    useEffect(() => {
        APP_ROUTES.forEach((route) => {
            if (route !== pathname) {
                router.prefetch(route);
            }
        });
    }, [pathname, router]);

    const publicLinks = useMemo(() => [
        { name: "Home", href: "/", icon: Home },
        { name: "About", href: "/about", icon: Info },
        { name: "Contact", href: "/contact", icon: Mail },
    ], []);

    const dashboardLinks = useMemo(() => [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Map View", href: "/map", icon: MapIcon },
        { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    ], []);

    const activeLinks = user ? dashboardLinks : publicLinks;
    const isActive = (path: string) => pathname === path;

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-[2000] border-b border-slate-200/50 bg-white/80 backdrop-blur-xl pt-[env(safe-area-inset-top)] dark:border-slate-800/50 dark:bg-slate-950/80"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 md:h-20 items-center justify-between">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
                            <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-500 transition-transform group-hover:scale-105">
                                SafeStreets
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
                        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-full px-2 py-1.5">
                            {activeLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:text-blue-600 dark:hover:text-blue-400 ${isActive(link.href)
                                        ? "text-blue-700 dark:text-blue-400"
                                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                                        }`}
                                >
                                    <link.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${isActive(link.href) ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-blue-500"}`} />
                                    {link.name}
                                    {isActive(link.href) && (
                                        <motion.div layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-blue-100 dark:bg-blue-900/40 shadow-sm border border-blue-200/50 dark:border-blue-800/50" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Desktop Auth Buttons */}
                    <div className="hidden md:block">
                        {isAuthReady && user ? (
                            <div className="flex items-center gap-4">
                                <NotificationBell />
                                <ProfileMenu user={user} />
                            </div>
                        ) : isAuthReady ? (
                            <div className="flex items-center space-x-3">
                                <Link href="/login">
                                    <Button variant="ghost" className="font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full px-6">
                                        Log in
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <Button variant="primary" className="font-semibold rounded-full px-6 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5">
                                        Sign up
                                    </Button>
                                </Link>
                            </div>
                        ) : null}
                    </div>

                    {/* Mobile: Notification + menu button */}
                    <div className="md:hidden flex items-center gap-2">
                        {isAuthReady && user && <NotificationBell />}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className={`relative z-[2010] inline-flex items-center justify-center rounded-full p-2.5 transition-all outline-none ${isOpen ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white rotate-90" : "bg-transparent text-slate-700 dark:text-slate-300 active:scale-95 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                        >
                            <span className="sr-only">Open main menu</span>
                            {!isOpen ? (
                                <Menu className="h-6 w-6" strokeWidth={2.5} />
                            ) : (
                                <X className="h-6 w-6" strokeWidth={2.5} />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu — Floating Island */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[1900] bg-slate-900/80 dark:bg-black/80 md:hidden"
                            onClick={() => setIsOpen(false)}
                            aria-hidden="true"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.25, type: "spring", stiffness: 300, damping: 25 }}
                            className="absolute left-3 right-3 top-[calc(100%+0.5rem)] z-[2000] md:hidden overflow-hidden rounded-3xl bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border border-slate-200 dark:bg-slate-900 dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] dark:border-slate-700/80"
                        >
                            <div className="flex flex-col p-3 gap-1">
                                {activeLinks.map((link, i) => (
                                    <motion.div
                                        key={link.name}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 + 0.1, type: "spring", stiffness: 300 }}
                                    >
                                        <Link
                                            href={link.href}
                                            className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 text-base font-bold transition-all active:scale-[0.98] ${isActive(link.href)
                                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                : "text-slate-700 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:hover:text-blue-400"
                                                }`}
                                        >
                                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${isActive(link.href) ? "bg-white text-blue-600 dark:bg-blue-950 dark:text-blue-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                                                <link.icon className="h-5 w-5" strokeWidth={2.5} />
                                            </div>
                                            {link.name}
                                        </Link>
                                    </motion.div>
                                ))}
                                
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    transition={{ delay: 0.3 }}
                                    className="mt-2 flex flex-col gap-2 border-t border-slate-100/80 px-2 pt-4 dark:border-slate-800/80"
                                >
                                {isAuthReady && user ? (
                                        <>
                                        <Link href="/profile">
                                            <Button variant="ghost" className="w-full justify-start gap-4 h-14 rounded-2xl text-base font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                                    <UserIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" strokeWidth={2.5} />
                                                </div>
                                                My Profile
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            onClick={handleLogout}
                                            className="w-full justify-start gap-4 h-14 rounded-2xl text-base font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
                                                <LogOut className="h-4 w-4 text-red-500" strokeWidth={2.5} />
                                            </div>
                                            Sign out
                                        </Button>
                                        </>
                                ) : isAuthReady ? (
                                        <div className="grid grid-cols-2 gap-3 pb-2">
                                            <Link href="/login" className="w-full">
                                                <Button variant="outline" className="w-full h-14 rounded-2xl text-base font-bold gap-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm active:scale-95">
                                                    <LogIn className="h-5 w-5 opacity-70" strokeWidth={2.5} />
                                                    Log in
                                                </Button>
                                            </Link>
                                            <Link href="/register" className="w-full">
                                                <Button variant="primary" className="w-full h-14 rounded-2xl text-base font-bold gap-2 shadow-lg shadow-blue-500/25 active:scale-95">
                                                    <UserPlus className="h-5 w-5 opacity-90" strokeWidth={2.5} />
                                                    Sign up
                                                </Button>
                                            </Link>
                                        </div>
                                ) : null}
                                </motion.div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.nav>
    );
};

export default Navbar;
