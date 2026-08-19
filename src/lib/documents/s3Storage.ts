import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { sanitizeFilename } from "./filename";

// S3-compatible driver — selected by STORAGE_DRIVER=s3 (src/lib/documents/storage.ts).
// Works against real AWS S3 or any S3-compatible endpoint (MinIO, s3rver, etc.)
// via S3_ENDPOINT + S3_FORCE_PATH_STYLE. Same storageKey shape as the local
// driver (organizationId/uuid-filename) — the Document model and every caller
// stay identical regardless of which driver is active.

let cachedClient: S3Client | null = null;

function client(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
        : undefined,
    // SDK v3 defaults to streaming, trailer-based checksums on PutObject,
    // which real AWS supports but many S3-compatible servers (self-hosted
    // MinIO setups, test doubles like s3rver) don't — the request hangs
    // rather than erroring. "WHEN_REQUIRED" only attaches a checksum when
    // the API call actually requires one, matching what every non-AWS
    // S3-compatible target in practice expects.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  return cachedClient;
}

function bucket(): string {
  const name = process.env.S3_BUCKET;
  if (!name) throw new Error("S3_BUCKET must be set when STORAGE_DRIVER=s3");
  return name;
}

export async function saveUploadedFile(organizationId: string, filename: string, bytes: Buffer): Promise<string> {
  const storageKey = `${organizationId}/${randomUUID()}-${sanitizeFilename(filename)}`;
  await client().send(new PutObjectCommand({ Bucket: bucket(), Key: storageKey, Body: bytes }));
  return storageKey;
}

export async function readUploadedFile(storageKey: string): Promise<Buffer> {
  const result = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: storageKey }));
  if (!result.Body) throw new Error(`No file found at storage key: ${storageKey}`);
  const chunks: Buffer[] = [];
  for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Test-only escape hatch — forces a fresh client (e.g. after changing S3_* env vars mid-process). */
export function __resetS3ClientForTests() {
  cachedClient = null;
}
