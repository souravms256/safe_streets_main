"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Slim minimalist footer for SafeStreets.
 * Focuses on high readability and essential information only.
 */
const Footer = () => {
    return (
        <motion.footer
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-white border-t border-slate-200 dark:bg-slate-950 dark:border-slate-800/60 transition-all duration-300"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between py-6 gap-6">

                    {/* Brand & Copyright Info */}
                    <div className="flex items-center gap-6">
                        <Link href="/" className="flex items-center gap-2 group transition-all">
                            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-500 group-hover:scale-110 transition-transform" />
                            <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                Safe<span className="text-blue-600 dark:text-blue-500">Streets</span>
                            </span>
                        </Link>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
                        <p suppressHydrationWarning className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            &copy; {new Date().getFullYear()} Global Community
                        </p>
                    </div>

                    {/* Compact Navigation & Status */}
                    <div className="flex items-center gap-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest transition-all">
                        <Link href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</Link>
                        <Link href="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact</Link>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                        <span className="flex items-center gap-1.5 text-green-500 tracking-tighter">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Live
                        </span>
                    </div>
                </div>
            </div>
        </motion.footer>
    );
};

export default Footer;
