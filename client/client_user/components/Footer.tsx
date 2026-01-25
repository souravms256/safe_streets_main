import React from "react";
import Link from "next/link";

const Footer = () => {
    return (
        <footer className="bg-slate-50 pt-16 pb-8 dark:bg-slate-900">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-4 lg:gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="mb-4 flex items-center gap-2">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                                SafeStreets
                            </span>
                        </Link>
                        <p className="mb-6 max-w-md text-base text-slate-600 dark:text-slate-400">
                            Building safer communities together. Report incidents, track safety
                            alerts, and stay informed about your neighborhood.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold tracking-wider text-slate-900 uppercase dark:text-white">
                            Platform
                        </h3>
                        <ul className="space-y-4">
                            <li>
                                <Link
                                    href="/about"
                                    className="text-base text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-500"
                                >
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/contact"
                                    className="text-base text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-500"
                                >
                                    Contact
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/dashboard"
                                    className="text-base text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-500"
                                >
                                    Dashboard
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-4 text-sm font-semibold tracking-wider text-slate-900 uppercase dark:text-white">
                            Legal
                        </h3>
                        <ul className="space-y-4">
                            <li>
                                <Link
                                    href="#"
                                    className="text-base text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-500"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="#"
                                    className="text-base text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-500"
                                >
                                    Terms of Service
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
                    <p className="text-center text-base text-slate-500 dark:text-slate-400">
                        &copy; {new Date().getFullYear()} SafeStreets. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
