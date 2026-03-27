"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator) || Capacitor.isNativePlatform()) {
            return;
        }

        // Service workers frequently cause stale bundles and cached route responses
        // during local development, so we explicitly remove them outside production.
        if (process.env.NODE_ENV !== "production") {
            navigator.serviceWorker
                .getRegistrations()
                .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
                .then(() => caches.keys())
                .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
                .catch((err) => {
                    console.error("SW cleanup failed:", err);
                });
            return;
        }

        navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => {
                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000); // Every hour
            })
            .catch((err) => {
                console.error("SW registration failed:", err);
            });
    }, []);

    return null;
}
