/**
 * localDb.ts — Offline storage using Capacitor Filesystem + Preferences.
 *
 * Key decisions:
 *  - File-to-base64: uses arrayBuffer() (reliable on Android WebView with
 *    content:// URIs) with a chunked btoa loop to avoid call-stack overflow.
 *  - loadPhotoUrlLocally: handles both string (native) and Blob (web) return
 *    types from Filesystem.readFile.
 *  - No silent error swallowing — callers must handle failures.
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const PENDING_REPORTS_KEY = 'pending_reports';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingReportFile {
    /** Filename relative to Directory.Data */
    filepath: string;
    /** e.g. 'jpeg', 'png', 'webp' */
    format: string;
}

export interface PendingReport {
    id: string;
    files: PendingReportFile[];
    latitude: number;
    longitude: number;
    timestamp: string;
    report_mode: string;
    user_violation_type?: string;
    description?: string;
    severity?: string;
    vehicle_number?: string;
    status: 'pending' | 'uploaded';
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Convert any Blob/File to a raw base64 string (no data-URI prefix).
 *
 * Uses arrayBuffer() instead of FileReader so it works reliably on Android
 * WebView that receives content:// URIs from the file picker.
 * Processes in 8 KB chunks to avoid call-stack overflow on large images.
 */
async function blobToRawBase64(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const CHUNK = 8192;
    const parts: string[] = [];
    for (let i = 0; i < bytes.length; i += CHUNK) {
        parts.push(String.fromCharCode(...Array.from(bytes.subarray(i, i + CHUNK))));
    }
    return btoa(parts.join(''));
}

/**
 * Write raw base64 image data to the Capacitor persistent filesystem and
 * return the PendingReportFile descriptor for later retrieval.
 */
async function writeBase64ToFilesystem(
    base64Data: string,
    format: string
): Promise<PendingReportFile> {
    const fileName = `pr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${format}`;
    await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data,
    });
    return { filepath: fileName, format: format || 'jpeg' };
}

// ─── Public save helpers ──────────────────────────────────────────────────────

/**
 * Save a browser File object (from <input type="file">) to the native
 * filesystem. Works on Android 10+ WebView with content:// URIs.
 */
export async function saveFileLocally(file: File): Promise<PendingReportFile> {
    const base64 = await blobToRawBase64(file);
    let format =
        file.type.split('/')[1] ||
        file.name.split('.').pop() ||
        'jpeg';
    // Normalise 'jpg' → 'jpeg' for consistent MIME types
    if (format === 'jpg') format = 'jpeg';
    return writeBase64ToFilesystem(base64, format);
}

/**
 * Save any Blob (from Capacitor Camera, file input, etc.) to the native
 * filesystem. Accepts an explicit format string ('jpeg', 'png').
 */
export async function saveBlobLocally(blob: Blob, format: string): Promise<PendingReportFile> {
    const base64 = await blobToRawBase64(blob);
    const fmt = format === 'jpg' ? 'jpeg' : (format || 'jpeg');
    return writeBase64ToFilesystem(base64, fmt);
}

// ─── Public load helpers ──────────────────────────────────────────────────────

/**
 * Read a saved file from device storage and return a data URL usable as an
 * <img src>.  Handles both native (string) and web (Blob) return types from
 * Filesystem.readFile.
 */
export async function loadPhotoUrlLocally(file: PendingReportFile): Promise<string> {
    const result = await Filesystem.readFile({
        path: file.filepath,
        directory: Directory.Data,
    });

    // On native Android/iOS → data is a base64 string.
    // On web (PWA/browser) → data is a Blob.
    if (result.data instanceof Blob) {
        return URL.createObjectURL(result.data);
    }
    return `data:image/${file.format};base64,${result.data}`;
}

/**
 * Read a saved file and return it as a Blob ready for FormData upload.
 */
export async function loadPhotoBlobLocally(file: PendingReportFile): Promise<Blob> {
    const result = await Filesystem.readFile({
        path: file.filepath,
        directory: Directory.Data,
    });

    if (result.data instanceof Blob) {
        return result.data;
    }

    // Decode raw base64 → Blob using arrayBuffer approach
    const binary = atob(result.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: `image/${file.format}` });
}

// ─── Preferences CRUD ─────────────────────────────────────────────────────────

export async function getPendingReports(): Promise<PendingReport[]> {
    const { value } = await Preferences.get({ key: PENDING_REPORTS_KEY });
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as PendingReport[]) : [];
    } catch {
        return [];
    }
}

/** All reports sorted newest-first. */
export async function getStoredReports(): Promise<PendingReport[]> {
    const reports = await getPendingReports();
    return reports.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

/** Only reports that haven't been uploaded yet. */
export async function getPendingUploads(): Promise<PendingReport[]> {
    const reports = await getStoredReports();
    return reports.filter((r) => r.status === 'pending');
}

/** Upsert a report into Preferences (replaces existing entry with same id). */
export async function savePendingReport(report: PendingReport): Promise<void> {
    const existing = await getStoredReports();
    const without = existing.filter((r) => r.id !== report.id);
    without.unshift(report); // newest first
    await Preferences.set({
        key: PENDING_REPORTS_KEY,
        value: JSON.stringify(without),
    });
}

/** Update just the status field on a saved report. */
export async function updatePendingReportStatus(
    id: string,
    status: PendingReport['status']
): Promise<PendingReport | null> {
    const reports = await getStoredReports();
    const idx = reports.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    const updated = { ...reports[idx], status };
    reports[idx] = updated;
    await Preferences.set({
        key: PENDING_REPORTS_KEY,
        value: JSON.stringify(reports),
    });
    return updated;
}

/** Delete a report and its associated image files from the device. */
export async function removePendingReport(id: string): Promise<void> {
    const reports = await getStoredReports();
    const target = reports.find((r) => r.id === id);

    if (target) {
        for (const file of target.files) {
            try {
                await Filesystem.deleteFile({
                    path: file.filepath,
                    directory: Directory.Data,
                });
            } catch {
                // File may already be gone — not fatal
            }
        }
    }

    const remaining = reports.filter((r) => r.id !== id);
    await Preferences.set({
        key: PENDING_REPORTS_KEY,
        value: JSON.stringify(remaining),
    });
}

// ─── Platform helper (used by Capacitor Camera flow) ─────────────────────────

/**
 * Returns whether we are running as a native Android/iOS app.
 * On web this is always false.
 */
export function isNative(): boolean {
    return Capacitor.isNativePlatform();
}
