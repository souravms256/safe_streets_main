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
                <div className="overflow-hidden bg-white shadow sm:rounded-lg dark:bg-slate-900">
                    <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-white">
                            User Profile
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Personal details and account information.
                        </p>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-800">
                        <dl>
                            <div className="bg-slate-50 px-4 py-5 dark:bg-slate-900 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Full name
                                </dt>
                                <dd className="mt-1 text-sm text-slate-900 dark:text-white sm:col-span-2 sm:mt-0">
                                    {user.full_name}
                                </dd>
                            </div>
                            <div className="bg-white px-4 py-5 dark:bg-slate-950 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Email address
                                </dt>
                                <dd className="mt-1 text-sm text-slate-900 dark:text-white sm:col-span-2 sm:mt-0">
                                    {user.email}
                                </dd>
                            </div>
                            <div className="bg-slate-50 px-4 py-5 dark:bg-slate-900 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Role
                                </dt>
                                <dd className="mt-1 text-sm text-slate-900 dark:text-white sm:col-span-2 sm:mt-0 uppercase">
                                    {user.role}
                                </dd>
                            </div>
                            <div className="bg-white px-4 py-5 dark:bg-slate-950 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Date of Birth
                                </dt>
                                <dd className="mt-1 text-sm text-slate-900 dark:text-white sm:col-span-2 sm:mt-0">
                                    {user.dob || "Not provided"}
                                </dd>
                            </div>
                            <div className="bg-slate-50 px-4 py-5 dark:bg-slate-900 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Joined
                                </dt>
                                <dd className="mt-1 text-sm text-slate-900 dark:text-white sm:col-span-2 sm:mt-0">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
}
