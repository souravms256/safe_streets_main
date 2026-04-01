/**
 * Offline Sync Service
 * Handles syncing pending reports to the backend
 */

import api from './api';
import {
  getPendingReportsByStatus,
  getPendingReport,
  updateReportStatus,
  deletePendingReport,
  dataUrlToFile,
} from './offlineQueue';
import type { PendingReport } from './offlineQueue';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Start with 1 second, exponential backoff

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRetryDelayMs(report: Pick<PendingReport, 'retryCount'>): number {
  return RETRY_DELAY_MS * 2 ** Math.max(0, report.retryCount - 1);
}

/**
 * Sync all pending reports
 */
export async function syncPendingReports(): Promise<{
  synced: string[];
  failed: string[];
}> {
  console.log('[Sync] Starting offline sync...');

  const pendingReports = await getPendingReportsByStatus('pending');
  const synced: string[] = [];
  const failed: string[] = [];

  for (const report of pendingReports) {
    const success = await syncSingleReport(report.id);
    if (success) {
      synced.push(report.id);
    } else {
      failed.push(report.id);
    }
  }

  console.log(`[Sync] Complete. Synced: ${synced.length}, Failed: ${failed.length}`);

  // Notify listeners about sync completion
  window.dispatchEvent(
    new CustomEvent('offline-sync-complete', {
      detail: { synced, failed },
    })
  );

  return { synced, failed };
}

/**
 * Sync a single pending report
 */
export async function syncSingleReport(reportId: string): Promise<boolean> {
  try {
    const report = await getPendingReport(reportId);
    if (!report) {
      console.warn(`[Sync] Report ${reportId} not found`);
      return false;
    }

    if (report.retryCount >= MAX_RETRIES) {
      console.error(`[Sync] Max retries exceeded for ${reportId}`);
      await updateReportStatus(reportId, 'failed', 'Max retries exceeded');
      return false;
    }

    console.log(`[Sync] Syncing report ${reportId} (retry ${report.retryCount})`);
    await updateReportStatus(reportId, 'retrying');

    if (report.retryCount > 0) {
      await delay(getRetryDelayMs(report));
    }

    // Build FormData from stored report
    const formData = new FormData();

    // Add images
    if (report.formData.imageUrls && report.formData.imageUrls.length > 0) {
      for (let i = 0; i < report.formData.imageUrls.length; i++) {
        const dataUrl = report.formData.imageUrls[i];
        const file = dataUrlToFile(dataUrl, `image-${i}.jpg`);
        formData.append('files', file);
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
    const response = await api.post('/violations/', formData);

    console.log(`[Sync] Successfully synced ${reportId}`, response.data);
    await deletePendingReport(reportId);

    // Dispatch event so UI can update
    window.dispatchEvent(
      new CustomEvent('report-synced', {
        detail: { reportId, detected_type: response.data.detected_type },
      })
    );

    return true;
  } catch (error) {
    console.error(`[Sync] Failed to sync ${reportId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateReportStatus(reportId, 'pending', errorMessage);
    return false;
  }
}

/**
 * Retry all failed reports
 */
export async function retryFailedReports(): Promise<{
  synced: string[];
  failed: string[];
}> {
  console.log('[Sync] Retrying failed reports...');

  const failedReports = await getPendingReportsByStatus('failed');
  const synced: string[] = [];
  const failed: string[] = [];

  for (const report of failedReports) {
    // Reset retry count to allow retries
    await updateReportStatus(report.id, 'pending', undefined, {
      resetRetryCount: true,
      clearLastError: true,
    });

    const success = await syncSingleReport(report.id);
    if (success) {
      synced.push(report.id);
    } else {
      failed.push(report.id);
    }
  }

  console.log(`[Sync] Retry complete. Synced: ${synced.length}, Failed: ${failed.length}`);

  return { synced, failed };
}

/**
 * Check if there are any pending reports
 */
export async function hasPendingReports(): Promise<boolean> {
  const pending = await getPendingReportsByStatus('pending');
  return pending.length > 0;
}

/**
 * Get count of reports that are immediately eligible for sync
 */
export async function getSyncReadyReportCount(): Promise<number> {
  const pending = await getPendingReportsByStatus('pending');
  return pending.length;
}

/**
 * Request background sync (if supported by browser)
 */
export async function requestBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Sync] Service Worker not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const swReg = registration as any; // Background Sync API is still experimental
    if (swReg.sync) {
      await swReg.sync.register('sync-violations');
      console.log('[Sync] Background sync registered');
    }
  } catch (error) {
    console.error('[Sync] Failed to register background sync:', error);
  }
}
