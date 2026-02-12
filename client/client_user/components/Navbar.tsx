"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./ui/Button";
import ProfileMenu from "./ProfileMenu";
import api from "@/services/api";
import { Menu, X } from "lucide-react";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        setUser(null);
        router.push("/login");
        setIsOpen(false);
    };

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem("access_token") : null;
        if (token) {
            api.get("/users/me")
                .then(res => setUser(res.data))
                .catch(() => setUser(null));
        } else {
            setUser(null);
        }
    }, [pathname]);

    // Close mobile menu on route change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const publicLinks = [
        { name: "Home", href: "/" },
        { name: "About", href: "/about" },
        { name: "Contact", href: "/contact" },
    ];

    const dashboardLinks = [
        { name: "Dashboard", href: "/dashboard" },
        { name: "Map View", href: "/map" },
    ];

    const activeLinks = user ? dashboardLinks : publicLinks;
    const isActive = (path: string) => pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-[2000] border-b border-slate-200/80 bg-white/90 backdrop-blur-xl pt-[env(safe-area-inset-top)] dark:border-slate-800/80 dark:bg-slate-900/90">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-14 md:h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
                            <span className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-500">
                                SafeStreets
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:block">
                        <div className="flex items-center space-x-8">
                            {activeLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`text-sm font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400 ${isActive(link.href)
                                        ? "text-blue-600 dark:text-blue-500"
                                        : "text-slate-600 dark:text-slate-300"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Desktop Auth Buttons */}
                    <div className="hidden md:block">
                        {user ? (
                            <ProfileMenu user={user} />
                        ) : (
                            <div className="flex items-center space-x-4">
                                <Link href="/login">
                                    <Button variant="ghost" size="sm">
                                        Log in
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <Button variant="primary" size="sm">
                                        Sign up
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 transition-colors active:bg-slate-100 dark:text-slate-300 dark:active:bg-slate-800"
                        >
                            <span className="sr-only">Open main menu</span>
                            {!isOpen ? (
                                <Menu className="h-5 w-5" />
                            ) : (
                                <X className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu — slide down */}
            <div
                className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                    }`}
            >
                <div className="space-y-1 bg-white px-4 pt-2 pb-4 shadow-lg dark:bg-slate-900">
                    {activeLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`block rounded-xl px-3 py-2.5 text-base font-medium transition-colors active:scale-[0.98] ${isActive(link.href)
                                ? "bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-500"
                                : "text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                    {user ? (
                        <div className="mt-3 flex flex-col space-y-2 border-t border-slate-200 px-3 pt-3 dark:border-slate-800">
                            <Link href="/profile">
                                <Button variant="ghost" className="w-full justify-start text-left">
                                    My Profile
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                onClick={handleLogout}
                                className="w-full justify-start text-left text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                                Sign out
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-3 flex flex-col space-y-2 border-t border-slate-200 px-3 pt-3 dark:border-slate-800">
                            <Link href="/login">
                                <Button variant="ghost" className="w-full justify-start">
                                    Log in
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button variant="primary" className="w-full">
                                    Sign up
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
