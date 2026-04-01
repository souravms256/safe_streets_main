"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }

        const handleServiceWorkerMessage = (event: MessageEvent) => {
            if (event.data?.type === "OFFLINE_SYNC_COMPLETE") {
                window.dispatchEvent(
                    new CustomEvent("offline-sync-complete", {
                        detail: event.data.detail,
                    })
                );
            }
        };

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

        navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

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

        return () => {
            navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
        };
    }, []);

    return null;
}
