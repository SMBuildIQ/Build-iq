import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- s3rver ships CommonJS only, no ESM/types entry
const S3rver = require("s3rver");

// KNOWN_LIMITATIONS.md said document storage is "local disk only... swapping
// to S3 only touches src/lib/documents/storage.ts" — a documented intention,
// never actually built or verified. This builds the real S3-compatible driver
// (src/lib/documents/s3Storage.ts) and verifies it against a real in-process
// S3-API server (s3rver), not a mock of what the AWS SDK calls "should" do.

const PORT = 14568;
const BUCKET = "test-bucket";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- s3rver ships no type definitions
let server: any;
let dataDir: string;

test("s3 storage driver", async (t) => {
  dataDir = await mkdtemp(path.join(tmpdir(), "s3rver-test-"));
  server = new S3rver({
    port: PORT,
    address: "localhost",
    silent: true,
    directory: dataDir,
    configureBuckets: [{ name: BUCKET, configs: [] }],
  });
  await server.run(); // .run() resolves to the bound address, not the instance — keep the instance for .close()

  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((err?: unknown) => (err ? reject(err) : resolve())));
    await rm(dataDir, { recursive: true, force: true });
  });

  const originalEnv = {
    STORAGE_DRIVER: process.env.STORAGE_DRIVER,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  };
  t.after(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key as keyof typeof originalEnv];
      else process.env[key as keyof typeof originalEnv] = value;
    }
  });

  process.env.STORAGE_DRIVER = "s3";
  process.env.S3_BUCKET = BUCKET;
  process.env.S3_ENDPOINT = `http://localhost:${PORT}`;
  process.env.S3_FORCE_PATH_STYLE = "true";
  process.env.S3_ACCESS_KEY_ID = "S3RVER";
  process.env.S3_SECRET_ACCESS_KEY = "S3RVER";

  // Import after env vars are set — storage.ts reads STORAGE_DRIVER lazily
  // per call (not cached at module load), so this works regardless of order,
  // but importing here keeps the intent obvious.
  const { saveUploadedFile, readUploadedFile } = await import("../src/lib/documents/storage");
  const { __resetS3ClientForTests } = await import("../src/lib/documents/s3Storage");
  __resetS3ClientForTests();

  await t.test("a file saved through the dispatcher round-trips byte-for-byte through a real S3-API server", async () => {
    const orgId = randomUUID();
    const content = Buffer.from("this is a real quote document, not a fixture description of one");
    const storageKey = await saveUploadedFile(orgId, "quote.pdf", content);

    assert.match(storageKey, new RegExp(`^${orgId}/[0-9a-f-]+-quote\\.pdf$`));

    const readBack = await readUploadedFile(storageKey);
    assert.ok(readBack.equals(content));
  });

  await t.test("storageKey is organization-prefixed and filename-sanitized, same shape as the local driver", async () => {
    const orgId = randomUUID();
    const storageKey = await saveUploadedFile(orgId, "../../etc/passwd; rm -rf.csv", Buffer.from("x"));
    assert.ok(storageKey.startsWith(`${orgId}/`));
    // Slashes and shell metacharacters are what actually enable path
    // traversal / injection — those must be stripped. A literal ".."
    // substring with no surrounding slash is inert and legitimately survives
    // (sanitizeFilename allows dots, same as "..gitignore" would).
    const filenamePart = storageKey.slice(`${orgId}/`.length);
    assert.doesNotMatch(filenamePart, /\/|;/);
  });

  await t.test("reading a storage key that was never written fails clearly rather than returning empty/garbage data", async () => {
    await assert.rejects(() => readUploadedFile(`${randomUUID()}/never-uploaded.pdf`));
  });

  await t.test("multiple files for the same organization don't collide", async () => {
    const orgId = randomUUID();
    const keyA = await saveUploadedFile(orgId, "a.csv", Buffer.from("file A"));
    const keyB = await saveUploadedFile(orgId, "b.csv", Buffer.from("file B"));
    assert.notEqual(keyA, keyB);
    assert.equal((await readUploadedFile(keyA)).toString(), "file A");
    assert.equal((await readUploadedFile(keyB)).toString(), "file B");
  });

  await t.test("a missing S3_BUCKET fails with a clear configuration error, not a confusing SDK error", async () => {
    delete process.env.S3_BUCKET;
    __resetS3ClientForTests();
    await assert.rejects(() => saveUploadedFile(randomUUID(), "x.csv", Buffer.from("x")), /S3_BUCKET must be set/);
    process.env.S3_BUCKET = BUCKET;
    __resetS3ClientForTests();
  });
});

test("the local driver still works unchanged when STORAGE_DRIVER is unset (default)", async (t) => {
  const original = process.env.STORAGE_DRIVER;
  delete process.env.STORAGE_DRIVER;
  t.after(() => {
    if (original === undefined) delete process.env.STORAGE_DRIVER;
    else process.env.STORAGE_DRIVER = original;
  });

  const { saveUploadedFile, readUploadedFile } = await import("../src/lib/documents/storage");
  const orgId = randomUUID();
  const content = Buffer.from("local disk content");
  const storageKey = await saveUploadedFile(orgId, "local.csv", content);
  const readBack = await readUploadedFile(storageKey);
  assert.ok(readBack.equals(content));
});
