"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/users");
            setUsers(res.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortConfig) return 0;

        let aValue: any = a;
        let bValue: any = b;

        if (sortConfig.key === 'created_at') {
            return sortConfig.direction === 'asc'
                ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }

        if (sortConfig.key === 'full_name') {
            aValue = a.full_name || "";
            bValue = b.full_name || "";
        } else if (sortConfig.key === 'role') {
            aValue = a.role;
            bValue = b.role;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedUsers.length / rowsPerPage);
    const paginatedUsers = sortedUsers.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, rowsPerPage]);

    if (loading) return <div className="p-8 text-gray-500">Loading users...</div>;

    return (
        <div className="flex flex-col gap-8 py-8">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-semibold tracking-tight text-white">Users</h2>
                        <p className="text-gray-400">Manage registered accounts and permissions.</p>
                    </div>
                    <Button onClick={fetchUsers} variant="outline" size="sm" className="bg-transparent border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white hover:border-gray-700">Refresh</Button>
                </div>

                {/* Filters */}
                <div className="flex justify-end">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-black border border-gray-800 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 w-full sm:w-64"
                    />
                </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-black overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-900/50 text-xs uppercase text-gray-400 font-medium">
                            <tr className="border-b border-gray-800">
                                <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('full_name')}>
                                    User {sortConfig?.key === 'full_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('role')}>
                                    Role {sortConfig?.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('created_at')}>
                                    Joined {sortConfig?.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {paginatedUsers.map((user) => (
                                <tr key={user.id} className="group hover:bg-gray-900/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-200">{user.full_name || "N/A"}</span>
                                            <span className="text-xs text-gray-500">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
                                            user.role === 'admin'
                                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                                : "bg-gray-800 text-gray-300 border-gray-700"
                                        )}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                        {formatDate(user.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/users/${user.id}`}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="bg-transparent border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white hover:border-gray-700 transition-all ml-auto h-8 text-xs"
                                            >
                                                View
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {paginatedUsers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        No users found matching search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="border-t border-gray-800 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>Rows per page:</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => setRowsPerPage(Number(e.target.value))}
                            className="bg-black border border-gray-800 rounded px-2 py-1 focus:outline-none focus:border-gray-600"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="bg-transparent border-gray-800 text-gray-400 hover:text-white disabled:opacity-50"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage >= totalPages}
                                className="bg-transparent border-gray-800 text-gray-400 hover:text-white disabled:opacity-50"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
