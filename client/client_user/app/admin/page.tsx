"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";

interface User {
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
}

interface Stats {
    total_users: number;
    message: string;
}

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersRes, statsRes] = await Promise.all([
                    api.get("/admin/users"),
                    api.get("/admin/dashboard")
                ]);
                setUsers(usersRes.data);
                setStats(statsRes.data);
            } catch (error) {
                console.error("Failed to load admin data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="p-8">Loading Admin Dashboard...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
            <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Admin Dashboard</h1>

            {stats && (
                <div className="mb-8 p-6 bg-white rounded-xl shadow-sm dark:bg-slate-900">
                    <h2 className="text-xl font-semibold mb-4">Statistics</h2>
                    <p>Total Users: {stats.total_users}</p>
                    <p>{stats.message}</p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm overflow-hidden dark:bg-slate-900">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-900 dark:divide-slate-800">
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{user.full_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(user.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
