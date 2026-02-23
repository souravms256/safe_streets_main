"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, ArrowLeft, RefreshCcw, Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import Navbar from "@/components/Navbar";
import PullToRefresh from "@/components/PullToRefresh";

interface LeaderboardUser {
    full_name: string;
    points: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
    const router = useRouter();
    const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
    const [currentUser, setCurrentUser] = useState<{ full_name: string; points?: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        setRefreshing(true);
        try {
            const [leaderRes, userRes] = await Promise.all([
                api.get("/users/leaderboard"),
                api.get("/users/me"),
            ]);
            setLeaders(Array.isArray(leaderRes.data) ? leaderRes.data : []);
            setCurrentUser(userRes.data);
        } catch (err) {
            console.error("Failed to fetch leaderboard:", err);
        } finally {
            setLoading(false);
            setTimeout(() => setRefreshing(false), 500);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            router.push("/login");
            return;
        }
        fetchData();
    }, [router, fetchData]);

    const isCurrentUser = (name: string) => currentUser?.full_name === name;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <Navbar />
            <PullToRefresh onRefresh={fetchData}>
                <div className="mx-auto max-w-2xl px-4 pt-24 pb-20">
                    {/* Header */}
                    <div className="mb-8">
                        <button
                            onClick={() => router.back()}
                            className="group flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors mb-6"
                        >
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Back
                        </button>

                        <div className="flex items-end justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                                        <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                            Leaderboard
                                        </h1>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Top reporters making streets safer
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => fetchData()}
                                disabled={refreshing}
                                className={`flex items-center justify-center h-10 w-10 rounded-2xl bg-white border border-slate-200 text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-95 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 ${refreshing ? "cursor-not-allowed opacity-50" : ""}`}
                            >
                                <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                    </div>

                    {/* Current User Rank */}
                    {currentUser && currentUser.points != null && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white shadow-xl shadow-blue-500/20"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-100">Your Points</p>
                                    <p className="text-3xl font-black mt-1">{currentUser.points || 0}</p>
                                </div>
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                                    <Crown className="h-7 w-7 text-white" />
                                </div>
                            </div>
                            {leaders.length > 0 && (() => {
                                const rank = leaders.findIndex(l => l.full_name === currentUser.full_name);
                                return rank >= 0 ? (
                                    <p className="text-sm text-blue-200 mt-2">
                                        You&apos;re ranked <span className="font-bold text-white">#{rank + 1}</span> out of {leaders.length}
                                    </p>
                                ) : (
                                    <p className="text-sm text-blue-200 mt-2">
                                        Keep reporting to climb the ranks!
                                    </p>
                                );
                            })()}
                        </motion.div>
                    )}

                    {/* Leaderboard List */}
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="animate-pulse rounded-2xl bg-white p-5 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-1/3 rounded bg-slate-100 dark:bg-slate-800" />
                                            <div className="h-3 w-1/5 rounded bg-slate-100 dark:bg-slate-800" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : leaders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-white border border-slate-100 py-20 text-center dark:bg-slate-900 dark:border-slate-800">
                            <Medal className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No rankings yet</h3>
                            <p className="text-sm text-slate-500 mt-1">Be the first to submit a verified report!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {leaders.map((leader, index) => {
                                const isCurrent = isCurrentUser(leader.full_name);
                                return (
                                    <motion.div
                                        key={leader.full_name}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`flex items-center gap-4 rounded-2xl p-4 sm:p-5 border transition-all ${
                                            isCurrent
                                                ? "bg-blue-50 border-blue-200 shadow-md dark:bg-blue-900/20 dark:border-blue-800"
                                                : "bg-white border-slate-100 hover:shadow-md dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700"
                                        }`}
                                    >
                                        {/* Rank */}
                                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black ${
                                            index === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                            index === 1 ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" :
                                            index === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" :
                                            "bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500"
                                        }`}>
                                            {index < 3 ? MEDALS[index] : index + 1}
                                        </div>

                                        {/* Name */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold truncate ${
                                                isCurrent
                                                    ? "text-blue-700 dark:text-blue-300"
                                                    : "text-slate-900 dark:text-white"
                                            }`}>
                                                {leader.full_name}
                                                {isCurrent && (
                                                    <span className="ml-2 text-xs font-medium text-blue-500 dark:text-blue-400">(You)</span>
                                                )}
                                            </p>
                                        </div>

                                        {/* Points */}
                                        <div className="text-right">
                                            <p className={`text-lg font-black tabular-nums ${
                                                index === 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
                                            }`}>
                                                {leader.points || 0}
                                            </p>
                                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">points</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </PullToRefresh>
        </div>
    );
}
