"use client";

import React, { useEffect, useCallback } from "react";
import Image from "next/image";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

declare module 'leaflet' {
    function heatLayer(latlngs: [number, number, number][], options: Record<string, unknown>): L.Layer;
}

// Fix Leaflet default icon issues in Next.js
const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const UserIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface Violation {
    id: string;
    user_id: string;
    location: string;
    violation_type: string;
    status: string;
    address?: string;
    image_url: string;
    details?: {
        address?: string;
        short_address?: string;
        [key: string]: unknown;
    };
}

interface MapProps {
    violations: Violation[];
    showHeatmap?: boolean;
    theme?: 'streets' | 'dark' | 'satellite';
    onViewChange?: (stats: { visibleCount: number }) => void;
    currentUserId?: string;
}

// Helper component to handle view changes and stats
function MapController({ violations, onViewChange }: { violations: Violation[], onViewChange?: (stats: { visibleCount: number }) => void }) {
    const map = useMap();

    const updateStats = useCallback(() => {
        if (!onViewChange) return;
        const bounds = map.getBounds();
        const visibleViolations = violations.filter(v => {
            const [lat, lon] = v.location.split(",").map(Number);
            return bounds.contains([lat, lon]);
        });
        onViewChange({ visibleCount: visibleViolations.length });
    }, [violations, onViewChange, map]);

    useMapEvents({
        moveend: updateStats,
        zoomend: updateStats,
    });

    useEffect(() => {
        const handleMove = (e: Event) => {
            const customEvent = e as CustomEvent<[number, number]>;
            if (customEvent.detail && Array.isArray(customEvent.detail)) {
                map.setView(customEvent.detail as [number, number], 16, { animate: true });
            }
        };
        window.addEventListener('map-move', handleMove);
        return () => window.removeEventListener('map-move', handleMove);
    }, [map]);

    useEffect(() => {
        if (violations.length > 0) {
            const bounds = L.latLngBounds(
                violations.map(v => {
                    const [lat, lon] = v.location.split(",").map(Number);
                    return [lat, lon] as [number, number];
                }).filter(coords => !isNaN(coords[0]) && !isNaN(coords[1]))
            );

            if (bounds.isValid()) {
                if (violations.length === 1) {
                    map.setView(bounds.getCenter(), 16);
                } else {
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
                }
            }
            updateStats();
        }
    }, [violations, map, updateStats]);

    return null;
}

function HeatmapLayer({ violations }: { violations: Violation[] }) {
    const map = useMap();

    useEffect(() => {
        const points = violations
            .map(v => {
                const [lat, lon] = v.location.split(",").map(Number);
                return [lat, lon, 0.5] as [number, number, number];
            })
            .filter(p => !isNaN(p[0]) && !isNaN(p[1]));

        const heatLayer = L.heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
        }).addTo(map);

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [violations, map]);

    return null;
}

export default function Map({ violations, showHeatmap = false, theme = 'streets', onViewChange, currentUserId }: MapProps) {
    const defaultCenter: [number, number] = [20.5937, 78.9629]; // India

    const tileUrls = {
        streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    };

    return (
        <MapContainer
            center={defaultCenter}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
        >
            <MapController violations={violations} onViewChange={onViewChange} />
            {showHeatmap && <HeatmapLayer violations={violations} />}

            <TileLayer
                attribution={theme === 'dark' ? '&copy; <a href="https://carto.com/">CARTO</a>' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
                url={tileUrls[theme]}
            />

            {!showHeatmap && violations.map((violation) => {
                const coords = violation.location.split(",").map(Number);
                if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return null;

                const isMyReport = violation.user_id === currentUserId;

                return (
                    <Marker
                        key={violation.id}
                        position={[coords[0], coords[1]]}
                        icon={isMyReport ? UserIcon : DefaultIcon}
                    >
                        <Popup className="premium-popup">
                            <div className="p-0.5 min-w-[220px]">
                                <div className="relative h-28 w-full mb-3 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                    <Image
                                        src={violation.image_url}
                                        fill
                                        className="object-cover transition-transform duration-500 hover:scale-110"
                                        alt="Violation"
                                    />
                                    {isMyReport && (
                                        <div className="absolute top-2 left-2 px-2.5 py-1 bg-blue-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-[0.15em] rounded-lg shadow-lg">
                                            Your Report
                                        </div>
                                    )}
                                </div>
                                <div className="px-1 pb-1">
                                    <h3 className="font-bold text-slate-900 leading-tight mb-1">{violation.violation_type}</h3>
                                    <p className="text-[11px] text-slate-500 mb-2 font-medium line-clamp-2">
                                        {violation.details?.short_address || violation.details?.address || violation.address || violation.location}
                                    </p>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider
                                            ${violation.status === 'Verified'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-amber-100 text-amber-700'}`}>
                                            {violation.status}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400">View Details →</span>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
