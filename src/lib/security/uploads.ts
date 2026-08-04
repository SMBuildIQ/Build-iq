/** Upload validation for App Store / Play Store-safe file handling */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_UPLOAD_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
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
  if (!ext || !ALLOWED_UPLOAD_EXT.has(ext)) {
    return "Unsupported file type. Use PDF, PNG, JPG, WEBP, or DWG.";
  }
  // Reject spoofed MIME unless empty (some mobile browsers omit type) or DWG.
  if (file.type && file.type !== "" && ext !== ".dwg" && !ALLOWED_UPLOAD_MIME.has(file.type)) {
    return "Unsupported MIME type.";
  }
  return null;
}

/** Magic-byte sniff to reduce MIME/extension spoofing. */
export function validateUploadBuffer(buffer: Buffer, ext: string): string | null {
  const e = ext.toLowerCase();
  if (e === ".dwg") {
    // DWG often starts with "AC10" — allow if present; otherwise still accept (vendor variance)
    if (buffer.length < 4) return "File too small.";
    return null;
  }
  if (e === ".pdf") {
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") return "File is not a valid PDF.";
    return null;
  }
  if (e === ".png") {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buffer.length < 8 || !buffer.subarray(0, 8).equals(sig)) return "File is not a valid PNG.";
    return null;
  }
  if (e === ".jpg" || e === ".jpeg") {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return "File is not a valid JPEG.";
    }
    return null;
  }
  if (e === ".webp") {
    if (
      buffer.length < 12 ||
      buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
      buffer.subarray(8, 12).toString("ascii") !== "WEBP"
    ) {
      return "File is not a valid WEBP.";
    }
    return null;
  }
  if (e === ".gif") {
    const head = buffer.subarray(0, 6).toString("ascii");
    if (head !== "GIF87a" && head !== "GIF89a") return "File is not a valid GIF.";
    return null;
  }
  return "Unsupported file type.";
}

export function assertProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error("AUTH_SECRET must be set to a strong 32+ character value in production.");
  }
}
