import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sanitizeFilename } from "./filename";

// Local-disk driver — the default (STORAGE_DRIVER unset or "local"). Not
// durable across instances/redeploys; see KNOWN_LIMITATIONS.md. storageKey
// never encodes a filesystem assumption beyond this module, which is what
// lets s3Storage.ts implement the identical interface as a drop-in swap.

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

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
