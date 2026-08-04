/** Upload validation for App Store / Play Store-safe file handling */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_UPLOAD_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/octet-stream", // some browsers send this for DWG/PDF
]);

export const ALLOWED_UPLOAD_EXT = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".dwg",
]);

export function validateUploadFile(file: File): string | null {
  if (file.size <= 0) return "Empty file rejected.";
  if (file.size > MAX_UPLOAD_BYTES) return "File exceeds 25 MB limit.";
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";
  if (ext && !ALLOWED_UPLOAD_EXT.has(ext)) {
    return "Unsupported file type. Use PDF, PNG, JPG, WEBP, or DWG.";
  }
  if (file.type && !ALLOWED_UPLOAD_MIME.has(file.type) && ext !== ".dwg") {
    // Allow empty type from some mobile browsers when extension is valid
    if (file.type !== "") return "Unsupported MIME type.";
  }
  return null;
}

export function assertProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error("AUTH_SECRET must be set to a strong 32+ character value in production.");
  }
}
