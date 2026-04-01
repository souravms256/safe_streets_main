/**
 * Offline Queue Service
 * Manages IndexedDB storage for pending violation reports and community issues.
 */

export interface PendingReport {
  id: string;
  timestamp: number;
  status: 'pending' | 'retrying' | 'failed';
  retryCount: number;
  lastError?: string;
  formData: {
    latitude: string;
    longitude: string;
    timestamp: string;
    report_mode: string;
    user_violation_type?: string;
    description?: string;
    severity?: string;
    vehicle_number?: string;
    imageUrls?: string[]; // Store as data URLs or blob references
  };
}

const DB_NAME = 'safestreets-offline-db';
const STORE_NAME = 'pending-reports';
const DB_VERSION = 2;

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('IndexedDB object store created');
      }

      // Create a simple key/value store for auth tokens so the Service Worker
      // can read the access token when performing background sync.
      if (!database.objectStoreNames.contains('auth')) {
        const authStore = database.createObjectStore('auth', { keyPath: 'key' });
        console.log('IndexedDB auth store created');
      }
    };
  });
}

/**
 * Store auth token for SW consumption
 */
export async function setAuthToken(token: string): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['auth'], 'readwrite');
    const store = transaction.objectStore('auth');
    const request = store.put({ key: 'access_token', value: token });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getAuthToken(): Promise<string | null> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['auth'], 'readonly');
    const store = transaction.objectStore('auth');
    const request = store.get('access_token');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (!request.result) return resolve(null);
      resolve(request.result.value || null);
    };
  });
}

export async function removeAuthToken(): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['auth'], 'readwrite');
    const store = transaction.objectStore('auth');
    const request = store.delete('access_token');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get IndexedDB instance, initializing if needed
 */
async function getDB(): Promise<IDBDatabase> {
  if (!db) {
    await initDB();
  }
  return db!;
}

/**
 * Save a pending report to IndexedDB
 */
export async function savePendingReport(
  formData: PendingReport['formData'],
  imageFiles?: File[]
): Promise<string> {
  const database = await getDB();
  const id = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Convert image files to data URLs for storage
  const imageUrls: string[] = [];
  if (imageFiles && imageFiles.length > 0) {
    for (const file of imageFiles) {
      const dataUrl = await fileToDataUrl(file);
      imageUrls.push(dataUrl);
    }
  }

  const report: PendingReport = {
    id,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
    formData: {
      ...formData,
      imageUrls,
    },
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(report);

    request.onerror = () => {
      console.error('Error saving pending report:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('Pending report saved:', id);
      resolve(id);
    };
  });
}

/**
 * Get all pending reports
 */
export async function getPendingReports(): Promise<PendingReport[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      console.error('Error retrieving pending reports:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result as PendingReport[]);
    };
  });
}

/**
 * Get pending reports by status
 */
export async function getPendingReportsByStatus(
  status: PendingReport['status']
): Promise<PendingReport[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll(status);

    request.onerror = () => {
      console.error('Error retrieving reports by status:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result as PendingReport[]);
    };
  });
}

/**
 * Get a specific pending report by ID
 */
export async function getPendingReport(id: string): Promise<PendingReport | undefined> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => {
      console.error('Error retrieving pending report:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result as PendingReport | undefined);
    };
  });
}

/**
 * Update a pending report's status
 */
export async function updateReportStatus(
  id: string,
  status: PendingReport['status'],
  lastError?: string,
  options?: {
    resetRetryCount?: boolean;
    clearLastError?: boolean;
  }
): Promise<void> {
  const database = await getDB();
  const report = await getPendingReport(id);

  if (!report) {
    throw new Error(`Report ${id} not found`);
  }

  report.status = status;
  if (lastError) {
    report.lastError = lastError;
  } else if (options?.clearLastError) {
    delete report.lastError;
  }
  if (status === 'retrying') {
    report.retryCount += 1;
  } else if (options?.resetRetryCount) {
    report.retryCount = 0;
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(report);

    request.onerror = () => {
      console.error('Error updating report status:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('Report status updated:', id, status);
      resolve();
    };
  });
}

/**
 * Delete a pending report
 */
export async function deletePendingReport(id: string): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => {
      console.error('Error deleting pending report:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('Pending report deleted:', id);
      resolve();
    };
  });
}

/**
 * Clear all pending reports
 */
export async function clearAllPendingReports(): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => {
      console.error('Error clearing pending reports:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('All pending reports cleared');
      resolve();
    };
  });
}

/**
 * Helper: Convert File to data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Helper: Convert data URL to Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
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

/**
 * Helper: Convert data URL to File
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const blob = dataUrlToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type });
}

/**
 * Get count of pending reports by status
 */
export async function getPendingReportCountByStatus(
  status: PendingReport['status']
): Promise<number> {
  const reports = await getPendingReportsByStatus(status);
  return reports.length;
}

/**
 * Get total count of pending reports
 */
export async function getPendingReportCount(): Promise<number> {
  const reports = await getPendingReports();
  return reports.length;
}
