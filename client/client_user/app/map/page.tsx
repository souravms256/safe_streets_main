"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
    Map as MapIcon,
    Loader2,
    AlertCircle,
    Filter,
    Flame,
    Layers,
    Search,
    ChevronRight,
    X,
    TrendingUp,
    MapPin
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

// Dynamically import Map component for SSR
const Map = dynamic(() => import("@/components/Map"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-900 animate-pulse rounded-2xl">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    )
});

export default function MapPage() {
    const router = useRouter();
    const [allViolations, setAllViolations] = useState<any[]>([]);
    const [filteredViolations, setFilteredViolations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [mapTheme, setMapTheme] = useState<'streets' | 'dark' | 'satellite'>('dark');
    const [showSidebar, setShowSidebar] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewStats, setViewStats] = useState({ visibleCount: 0 });

    // Filter states
    const [selectedType, setSelectedType] = useState("All");
    const [dateRange, setDateRange] = useState("all");

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            router.push("/login");
            return;
        }

        Promise.all([
            api.get("/users/me"),
            api.get("/violations/public")
        ]).then(([userRes, violationsRes]) => {
            setUser(userRes.data);
            setAllViolations(violationsRes.data);
            setFilteredViolations(violationsRes.data);
        })
            .catch((err) => {
                console.error("Failed to fetch map data:", err);
                if (err.response?.status === 401) router.push("/login");
            })
            .finally(() => setLoading(false));
    }, [router]);

    // Filter logic
    useEffect(() => {
        let filtered = allViolations;

        if (selectedType !== "All") {
            filtered = filtered.filter(v => v.violation_type.includes(selectedType));
        }

        if (dateRange !== "all") {
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            if (dateRange === "24h") filtered = filtered.filter(v => new Date(v.created_at) > last24h);
            if (dateRange === "7d") filtered = filtered.filter(v => new Date(v.created_at) > last7d);
        }

        setFilteredViolations(filtered);
    }, [selectedType, dateRange, allViolations]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data && data[0]) {
                const { lat, lon } = data[0];
                // Since Map is dynamic, we use a simple trick to refocus by updating a 'center' event if we had one.
                // For now, let's just use a window custom event that the MapController can listen to.
                window.dispatchEvent(new CustomEvent('map-move', { detail: [parseFloat(lat), parseFloat(lon)] }));
            }
        } catch (err) {
            console.error("Search failed:", err);
        }
    };

    const violationTypes = ["All", "Helmet Violation", "Triple Riding", "No Violation"];

    return (
        <div className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950 pt-24 pb-8 overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-[calc(100vh-10rem)] relative">

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
                            <MapIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Violation Hotspots
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Real-time safety awareness map.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <form onSubmit={handleSearch} className="relative group flex-grow md:flex-grow-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-64 transition-all"
                            />
                        </form>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowSidebar(!showSidebar)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filters
                        </Button>
                    </div>
                </motion.div>

                {/* Main Content Area */}
                <div className="relative h-full w-full flex gap-6">

                    {/* Sidebar Filters */}
                    <AnimatePresence>
                        {showSidebar && (
                            <motion.div
                                initial={{ x: -400, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -400, opacity: 0 }}
                                className="absolute inset-y-0 left-0 z-30 h-full w-full bg-white p-6 shadow-xl dark:bg-slate-900 md:static md:w-80 md:rounded-3xl md:border md:border-slate-200 md:dark:border-slate-800"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-blue-500" />
                                        Map Controls
                                    </h3>
                                    <button onClick={() => setShowSidebar(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* Map Style */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">Map Theme</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['streets', 'dark', 'satellite'] as const).map((t) => (
                                                <button
                                                    key={t}
                                                    onClick={() => setMapTheme(t)}
                                                    className={`py-2 px-1 rounded-xl text-[10px] font-bold uppercase transition-all border
                                                        ${mapTheme === t
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                            : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100'}`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Visualization Mode */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">Layer Mode</label>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => setShowHeatmap(false)}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left
                                                    ${!showHeatmap ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'bg-transparent border-slate-100 dark:border-slate-800 text-slate-500'}`}
                                            >
                                                <MapPin className="w-5 h-5 flex-shrink-0" />
                                                <div>
                                                    <p className="font-bold text-sm">Pin Markers</p>
                                                    <p className="text-[10px] opacity-70">Precise violation spots</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setShowHeatmap(true)}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left
                                                    ${showHeatmap ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400' : 'bg-transparent border-slate-100 dark:border-slate-800 text-slate-500'}`}
                                            >
                                                <Flame className="w-5 h-5 flex-shrink-0" />
                                                <div>
                                                    <p className="font-bold text-sm">Heatmap View</p>
                                                    <p className="text-[10px] opacity-70">Intensity & dangerzones</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Violation Type */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">Violation Type</label>
                                        <div className="flex flex-wrap gap-2">
                                            {violationTypes.map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setSelectedType(type)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                                                        ${selectedType === type
                                                            ? 'bg-blue-600 text-white shadow-md'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Time Period */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">Time Window</label>
                                        <select
                                            value={dateRange}
                                            onChange={(e) => setDateRange(e.target.value)}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all"
                                        >
                                            <option value="all">All Time History</option>
                                            <option value="24h">Last 24 Hours</option>
                                            <option value="7d">Last 7 Days</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-12 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed flex gap-2">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        Public view allows anyone to see incident markers without images.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Map Container Area */}
                    <motion.div
                        layout
                        className="flex-grow relative group overflow-hidden bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl"
                    >
                        {loading ? (
                            <div className="flex h-full items-center justify-center">
                                <div className="text-center">
                                    <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
                                    <p className="text-slate-500 font-bold animate-pulse">Initializing Map Layers...</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Map
                                    violations={filteredViolations}
                                    showHeatmap={showHeatmap}
                                    theme={mapTheme}
                                    onViewChange={setViewStats}
                                    currentUserId={user?.user_id}
                                />

                                {/* Live View Stats Overlay */}
                                <div className="absolute top-6 right-6 z-[1000]">
                                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-5 py-4 rounded-3xl border border-white/20 dark:border-slate-800/30 shadow-2xl shadow-black/10 flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">In Map View</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                                                    {viewStats.visibleCount}
                                                </span>
                                                <span className="text-[10px] font-bold text-green-500 uppercase tracking-tighter">Live</span>
                                            </div>
                                        </div>
                                        <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Filtered</span>
                                            <span className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                                                {filteredViolations.length}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Heatmap Legend (only when heatmap is on) */}
                                <AnimatePresence>
                                    {showHeatmap && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="absolute bottom-6 right-6 z-[1000] bg-white/90 dark:bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 shadow-lg text-[10px] font-bold uppercase tracking-widest text-slate-500"
                                        >
                                            Danger Zone Intensity
                                            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-lime-500 to-red-500 rounded-full mt-2" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
