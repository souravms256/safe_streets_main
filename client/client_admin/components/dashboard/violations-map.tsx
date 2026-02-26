"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';


import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// CDN Icons used below

interface Violation {
    id: string;
    violation_type: string;
    location: string;
    description?: string;
    image_url?: string;
    created_at: string;
    status: string;
}

import { HeatmapLayer } from './heatmap-layer';

export function ViolationsMap({ violations, showHeatmap = false }: { violations: Violation[], showHeatmap?: boolean }) {

    // Create custom icon
    // Create custom icon
    const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // Center map on Bangalore (or first violation)
    const validViolations = violations.filter(v => v.location && v.location.includes(','));

    // Default center (Bangalore)
    let center: [number, number] = [12.9716, 77.5946];

    if (validViolations.length > 0) {
        const parts = validViolations[0].location.split(',').map(n => parseFloat(n.trim()));
        if (!isNaN(parts[0]) && !isNaN(parts[1])) {
            center = [parts[0], parts[1]];
        }
    }

    const heatmapPoints: [number, number, number][] = validViolations.map(v => {
        const parts = v.location.split(',').map(n => parseFloat(n.trim()));
        if (isNaN(parts[0]) || isNaN(parts[1])) return null;
        return [parts[0], parts[1], 1]; // Intensity 1
    }).filter(p => p !== null) as [number, number, number][];

    return (
        <div className="h-[600px] w-full rounded-lg overflow-hidden border border-gray-800 z-0">
            <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {showHeatmap ? (
                    <HeatmapLayer points={heatmapPoints} />
                ) : (
                    validViolations.map((v) => {
                        const parts = v.location.split(',').map(n => parseFloat(n.trim()));
                        if (isNaN(parts[0]) || isNaN(parts[1])) return null;

                        return (
                            <Marker key={v.id} position={[parts[0], parts[1]]} icon={defaultIcon}>
                                <Popup>
                                    <div className="p-1 min-w-[150px]">
                                        <p className="font-bold text-sm mb-1">{v.violation_type}</p>
                                        <p className="text-xs text-gray-600 mb-2">{v.status}</p>
                                        {v.image_url && <img src={v.image_url} alt="Evidence" className="w-full h-24 object-cover rounded" />}
                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(v.created_at).toLocaleDateString()}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })
                )}
            </MapContainer>
        </div>
    );
}
