const CACHE_NAME = 'safestreets-v3';
const DB_NAME = 'safestreets-offline-db';
const DB_VERSION = 2;
const PENDING_REPORTS_STORE = 'pending-reports';
const AUTH_STORE = 'auth';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/offline',
];

// Install event - pre-cache core static assets (individually, so one failure doesn't block install)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                STATIC_ASSETS.map((url) => cache.add(url).catch(() => { }))
            );
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip blob: and data: URLs — these are in-memory and must not be intercepted
    if (request.url.startsWith('blob:') || request.url.startsWith('data:')) return;

    // Skip API requests and external origins - always go to network
    if (request.url.includes('/api/') || request.url.includes(':8000') || url.origin !== self.location.origin) {
        return;
    }

    // Navigation requests — network first, cache fallback, offline page last resort
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((cached) => {
                        return cached || caches.match('/offline');
                    });
                })
        );
        return;
    }

    // Static assets — stale-while-revalidate
    event.respondWith(
        caches.match(request).then((cached) => {
            const networkFetch = fetch(request).then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            }).catch(() => cached || new Response('Offline', { status: 503 }));

            return cached || networkFetch;
        })
    );
});

// Background sync for offline report submissions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-violations') {
        event.waitUntil(syncViolations());
    }
});

async function syncViolations() {
    console.log('[SW] Syncing pending violations...');
    try {
        const token = await getStoredToken();
        if (!token) {
            console.warn('[SW] No stored auth token available; skipping background sync');
            return;
        }

        // Get all pending reports from IndexedDB
        const db = await openDB();
        const reports = await getAllPendingReports(db);
        
        console.log(`[SW] Found ${reports.length} pending reports to sync`);
        
        let synced = 0;
        let failed = 0;
        
        for (const report of reports) {
            try {
                // Build FormData from stored report
                const formData = new FormData();
                
                // Add images
                if (report.formData.imageUrls && report.formData.imageUrls.length > 0) {
                    for (let i = 0; i < report.formData.imageUrls.length; i++) {
                        const dataUrl = report.formData.imageUrls[i];
                        const blob = dataUrlToBlob(dataUrl);
                        formData.append('files', blob, `image-${i}.jpg`);
                    }
                }
                
                // Add form fields
                formData.append('latitude', report.formData.latitude);
                formData.append('longitude', report.formData.longitude);
                formData.append('timestamp', report.formData.timestamp);
                formData.append('report_mode', report.formData.report_mode);
                
                if (report.formData.user_violation_type) {
                    formData.append('user_violation_type', report.formData.user_violation_type);
                }
                if (report.formData.description) {
                    formData.append('description', report.formData.description);
                }
                if (report.formData.severity) {
                    formData.append('severity', report.formData.severity);
                }
                if (report.formData.vehicle_number) {
                    formData.append('vehicle_number', report.formData.vehicle_number);
                }
                
                // Submit to backend
                const response = await fetch('/api/violations/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    console.log(`[SW] Successfully synced report ${report.id}`);
                    await deletePendingReport(db, report.id);
                    synced++;
                } else {
                    console.error(`[SW] Failed to sync report ${report.id}: ${response.status}`);
                    failed++;
                }
            } catch (error) {
                console.error(`[SW] Error syncing report ${report.id}:`, error);
                failed++;
            }
        }
        
        console.log(`[SW] Sync complete: ${synced} synced, ${failed} failed`);
        
        // Notify all clients about sync completion
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'OFFLINE_SYNC_COMPLETE',
                detail: { synced, failed }
            });
        });
    } catch (error) {
        console.error('[SW] Sync error:', error);
    }
}

// IndexedDB helpers for SW
async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(PENDING_REPORTS_STORE)) {
                const store = db.createObjectStore(PENDING_REPORTS_STORE, { keyPath: 'id' });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }

            if (!db.objectStoreNames.contains(AUTH_STORE)) {
                db.createObjectStore(AUTH_STORE, { keyPath: 'key' });
            }
        };

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function getAllPendingReports(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PENDING_REPORTS_STORE], 'readonly');
        const store = transaction.objectStore(PENDING_REPORTS_STORE);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function deletePendingReport(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PENDING_REPORTS_STORE], 'readwrite');
        const store = transaction.objectStore(PENDING_REPORTS_STORE);
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

async function getStoredToken() {
    // Attempt to read token from IndexedDB 'auth' store where the client
    // is expected to write it. Service Workers cannot access localStorage.
    try {
        const db = await openDB();
        return await new Promise((resolve) => {
            try {
                const tx = db.transaction([AUTH_STORE], 'readonly');
                const store = tx.objectStore(AUTH_STORE);
                const req = store.get('access_token');
                req.onsuccess = () => resolve((req.result && req.result.value) || '');
                req.onerror = () => resolve('');
            } catch (e) {
                console.warn('[SW] Failed to read token from IndexedDB', e);
                resolve('');
            }
        });
    } catch (e) {
        console.warn('[SW] getStoredToken: IndexedDB read failed', e);
        return '';
    }
}

function dataUrlToBlob(dataUrl) {
    const [header, data] = dataUrl.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(data);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }
    
    return new Blob([u8arr], { type: mime });
}

// Push notification handler
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/dashboard'
        },
        actions: [
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'SafeStreets', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const url = event.notification.data?.url || '/dashboard';
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});
