"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/Button";

import ProfileMenu from "./ProfileMenu";
import api from "@/services/api";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const pathname = usePathname();

    useEffect(() => {
        // Check localStorage for access_token
        const token = typeof window !== 'undefined' ? localStorage.getItem("access_token") : null;
        if (token) {
            api.get("/users/me")
                .then(res => setUser(res.data))
                .catch(() => setUser(null)); // Token might be invalid
        } else {
            setUser(null);
        }
    }, [pathname]); // Re-check on route change (e.g. after login redirect)

    const isDashboard = pathname.startsWith("/dashboard");

    const publicLinks = [
        { name: "Home", href: "/" },
        { name: "About", href: "/about" },
        { name: "Contact", href: "/contact" },
    ];

    const dashboardLinks = [
        { name: "Dashboard", href: "/dashboard" },
        { name: "My Reports", href: "/dashboard" }, // Can add more dashboard specific links here
    ];

    // If on dashboard, show dashboard links (or keep it simple), else public links
    // User requested "header in dashboard should be different", so let's differentiate.
    // Dashboard header will be simpler/focused.
    const activeLinks = isDashboard ? dashboardLinks : publicLinks;


    const isActive = (path: string) => pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <Link href={isDashboard ? "/dashboard" : "/"} className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                                SafeStreets
                            </span>
                            {isDashboard && (
                                <span className="hidden sm:inline-block text-sm font-medium text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 pl-3 ml-3">
                                    Dashboard
                                </span>
                            )}
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
                            className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <span className="sr-only">Open main menu</span>
                            {!isOpen ? (
                                <svg
                                    className="block h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="block h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden">
                    <div className="space-y-1 bg-white px-2 pt-2 pb-3 shadow-lg dark:bg-slate-900">
                        {activeLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className={`block rounded-md px-3 py-2 text-base font-medium ${isActive(link.href)
                                    ? "bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-500"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                    }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                        {/* Only show login/signup in mobile menu if NOT logged in */}
                        {!user && (
                            <div className="mt-4 flex flex-col space-y-2 border-t border-slate-200 px-3 pt-4 dark:border-slate-800">
                                <Link href="/login" onClick={() => setIsOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start">
                                        Log in
                                    </Button>
                                </Link>
                                <Link href="/register" onClick={() => setIsOpen(false)}>
                                    <Button variant="primary" className="w-full">
                                        Sign up
                                    </Button>
                                </Link>
                            </div>
                        )}
                        {/* If logged in, ProfileMenu handles desktop, but for mobile we might want a logout button here or assume they use the desktop-like profile menu if it's visible. 
                            However, ProfileMenu is hidden on mobile currently in the desktop section. 
                            Let's add a logout button or similar for mobile if user exists, OR simply rely on the user finding the way (usually mobile menus include profile links). 
                            Looking at original code, ProfileMenu was hidden on mobile. 
                            Let's keep it simple for now as per instructions. 
                        */}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
