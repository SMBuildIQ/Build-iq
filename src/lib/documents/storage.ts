import * as localDriver from "./localStorage";
import * as s3Driver from "./s3Storage";

// Local disk by default; set STORAGE_DRIVER=s3 (plus S3_BUCKET and friends —
// see s3Storage.ts) to use an S3-compatible bucket instead. Both drivers
// implement the identical two-function interface below, and storageKey
// (organizationId/uuid-filename) never encodes a filesystem assumption, so
// this is a real drop-in swap, not just a documented intention — verified
// against a real in-process S3-API server in tests/s3-storage.test.ts.

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain",
]);

function driver() {
  return process.env.STORAGE_DRIVER === "s3" ? s3Driver : localDriver;
}

export async function saveUploadedFile(organizationId: string, filename: string, bytes: Buffer): Promise<string> {
  return driver().saveUploadedFile(organizationId, filename, bytes);
}

export async function readUploadedFile(storageKey: string): Promise<Buffer> {
  return driver().readUploadedFile(storageKey);
}
