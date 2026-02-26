"use client";

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';


interface HeatmapLayerProps {
    points: [number, number, number][]; // lat, lng, intensity
}

export function HeatmapLayer({ points }: HeatmapLayerProps) {
    const map = useMap();

    useEffect(() => {
        if (!points || points.length === 0) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let heatLayer: any = null;

        (async () => {
            try {
                // Ensure L is available globally for leaflet.heat
                if (typeof window !== 'undefined') {
                    if (!window.L) {
                        window.L = L;
                    }
                }

                // Dynamically import leaflet.heat
                await import('leaflet.heat');

                if (L.heatLayer) {
                    heatLayer = L.heatLayer(points, {
                        radius: 25,
                        blur: 15,
                        maxZoom: 17,
                        gradient: {
                            0.4: 'blue',
                            0.6: 'cyan',
                            0.7: 'lime',
                            0.8: 'yellow',
                            1.0: 'red'
                        }
                    });

                    heatLayer.addTo(map);
                }
            } catch (error) {
                console.error("Failed to load heatmap layer", error);
            }
        })();

        return () => {
            if (heatLayer) {
                map.removeLayer(heatLayer);
            }
        };
    }, [map, points]);

    return null;
}
