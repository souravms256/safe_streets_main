"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/users/me")
            .then((res) => setUser(res.data))
            .catch((err) => console.error("Failed to load profile", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center">Loading Profile...</div>;

    if (!user) return <div className="p-8 text-center">Failed to load profile.</div>;

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
                <div className="overflow-hidden bg-white shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl dark:bg-slate-900 dark:ring-slate-800">
                    <div className="px-4 py-6 sm:px-6">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold dark:bg-blue-900/30 dark:text-blue-400">
                                {user.full_name?.charAt(0) || "U"}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold leading-7 text-slate-900 dark:text-white">
                                    {user.full_name}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800">
                        <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                            {[
                                { label: "Role", value: user.role, uppercase: true },
                                { label: "Date of Birth", value: user.dob || "Not provided" },
                                { label: "Member Since", value: new Date(user.created_at).toLocaleDateString() }
                            ].map((item, idx) => (
                                <div key={idx} className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        {item.label}
                                    </dt>
                                    <dd className={`mt-1 text-sm text-slate-900 dark:text-white sm:col-span-2 sm:mt-0 ${item.uppercase ? 'uppercase' : ''}`}>
                                        {item.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
}
