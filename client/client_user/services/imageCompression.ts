/**
 * Image compression utility for optimizing uploads before sending to server.
 * Reduces file size while maintaining quality for evidence photos.
 */

interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeMB?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
    maxSizeMB: 2,
};

/**
 * Compress an image file before upload.
 * @param file - The original image file
 * @param options - Compression options
 * @returns Compressed image as a Blob
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<Blob> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                const maxWidth = opts.maxWidth!;
                const maxHeight = opts.maxHeight!;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                // Create canvas and draw resized image
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Failed to get canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob with compression
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error("Failed to compress image"));
                        }
                    },
                    "image/jpeg",
                    opts.quality
                );
            };

            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = event.target?.result as string;
        };

        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}

/**
 * Get the file size in MB.
 */
export function getFileSizeMB(file: File | Blob): number {
    return file.size / (1024 * 1024);
}

/**
 * Check if a file needs compression.
 */
export function needsCompression(file: File, maxSizeMB: number = 2): boolean {
    return getFileSizeMB(file) > maxSizeMB || file.type !== "image/jpeg";
}

/**
 * Create a File object from a Blob with a filename.
 */
export function blobToFile(blob: Blob, filename: string): File {
    return new File([blob], filename, { type: blob.type });
}
