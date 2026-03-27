import api from "@/services/api";
import { blobToFile, compressImage, needsCompression } from "@/services/imageCompression";
import { loadPhotoBlobLocally, PendingReport } from "@/services/localDb";

async function appendReportFiles(formData: FormData, report: PendingReport) {
    for (let i = 0; i < report.files.length; i += 1) {
        const fileRecord = report.files[i];
        const blob = await loadPhotoBlobLocally(fileRecord);

        let uploadFile: File | Blob = blob;
        if (needsCompression(blob as File)) {
            try {
                const compressedBlob = await compressImage(blobToFile(blob, `photo_${i}.${fileRecord.format}`));
                uploadFile = blobToFile(compressedBlob, `photo_${i}.${fileRecord.format}`);
            } catch {
                uploadFile = blobToFile(blob, `photo_${i}.${fileRecord.format}`);
            }
        } else {
            uploadFile = blobToFile(blob, `photo_${i}.${fileRecord.format}`);
        }

        formData.append("files", uploadFile);
    }
}

export async function buildReportFormData(report: PendingReport) {
    const formData = new FormData();

    await appendReportFiles(formData, report);

    formData.append("latitude", report.latitude.toString());
    formData.append("longitude", report.longitude.toString());
    formData.append("timestamp", report.timestamp);
    formData.append("report_mode", report.report_mode);

    if (report.user_violation_type) {
        formData.append("user_violation_type", report.user_violation_type);
    }
    if (report.description) {
        formData.append("description", report.description);
    }
    if (report.severity) {
        formData.append("severity", report.severity);
    }
    if (report.vehicle_number) {
        formData.append("vehicle_number", report.vehicle_number);
    }

    return formData;
}

export async function uploadPendingReport(report: PendingReport) {
    const formData = await buildReportFormData(report);

    return api.post("/violations/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
}
