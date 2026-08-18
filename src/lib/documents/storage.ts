import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Local-disk object storage. Not durable across instances/redeploys — this is
// the same tradeoff called out in KNOWN_LIMITATIONS.md and ARCHITECTURE.md:
// production should swap this for an S3-compatible bucket keyed the same way
// (organizationId/storageKey), which is why storageKey never encodes a local
// filesystem assumption beyond this module.

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

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

export async function saveUploadedFile(organizationId: string, filename: string, bytes: Buffer): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, organizationId);
  await mkdir(dir, { recursive: true });
  const storageKey = `${organizationId}/${randomUUID()}-${sanitizeFilename(filename)}`;
  await writeFile(path.join(UPLOAD_ROOT, storageKey), bytes);
  return storageKey;
}

export async function readUploadedFile(storageKey: string): Promise<Buffer> {
  return readFile(path.join(UPLOAD_ROOT, storageKey));
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}
