"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

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

    const updateStats = () => {
        if (!onViewChange) return;
        const bounds = map.getBounds();
        const visibleViolations = violations.filter(v => {
            const [lat, lon] = v.location.split(",").map(Number);
            return bounds.contains([lat, lon]);
        });
        onViewChange({ visibleCount: visibleViolations.length });
    };

    useMapEvents({
        moveend: updateStats,
        zoomend: updateStats,
    });

    useEffect(() => {
        const handleMove = (e: any) => {
            if (e.detail && Array.isArray(e.detail)) {
                map.setView(e.detail as [number, number], 16, { animate: true });
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
    }, [violations, map]);

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

        const heatLayer = (L as any).heatLayer(points, {
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
                        <Popup>
                            <div className="p-2 min-w-[200px] dark:text-slate-900">
                                {isMyReport && (
                                    <div className="mb-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full w-fit">
                                        Your Report
                                    </div>
                                )}
                                <img
                                    src={violation.image_url}
                                    className="w-full h-24 object-cover rounded-md mb-2 bg-slate-100"
                                    alt="Violation"
                                />
                                <h3 className="font-bold">{violation.violation_type}</h3>
                                <p className="text-xs mb-1">{violation.address || violation.location}</p>
                                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium 
                                    ${violation.status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {violation.status}
                                </span>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
