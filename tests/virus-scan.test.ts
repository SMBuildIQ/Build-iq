import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scanForViruses } from "../src/lib/documents/virusScan";

// KNOWN_LIMITATIONS.md said virus scanning was "Not started" — Document.virusScanStatus
// was always hardcoded to "skipped". This verifies the real driver (src/lib/documents/virusScan.ts)
// against a real `clamscan` binary, using the industry-standard EICAR test string (not
// live malware) as the "virus" — a purpose-built, harmless 68-byte signature every AV
// vendor recognizes specifically so integrations can be tested like this. A custom,
// tiny signature database is built per-test-run rather than depending on the machine's
// system ClamAV database, so this is hermetic.
//
// clamscan is a system binary, not an npm dependency — unlike s3rver, it can't be
// guaranteed present on every machine this suite runs on. Every test below checks for
// it first and skips cleanly (not fails) when it's missing, the same way the Postgres
// migration was verified locally without making the committed suite depend on a
// Postgres server being installed.

const CLAMSCAN_BIN = process.env.CLAMSCAN_BIN ?? "clamscan";
const EICAR = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
const EICAR_MD5 = "44d88612fea8a8f36de82e1278abb02f";

function clamscanAvailable(): boolean {
  try {
    execFileSync(CLAMSCAN_BIN, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function withTestDb<T>(fn: (dbPath: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "clamav-test-db-"));
  await writeFile(path.join(dir, "eicar.hdb"), `${EICAR_MD5}:${EICAR.length}:Eicar-Test-Signature\n`);
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("scanForViruses reports the real EICAR test string as infected against a real clamscan + custom signature db", async (t) => {
  if (!clamscanAvailable()) {
    t.skip("clamscan not installed on this machine");
    return;
  }
  const original = { VIRUS_SCAN_DRIVER: process.env.VIRUS_SCAN_DRIVER, CLAMAV_DB_PATH: process.env.CLAMAV_DB_PATH };
  t.after(() => {
    if (original.VIRUS_SCAN_DRIVER === undefined) delete process.env.VIRUS_SCAN_DRIVER;
    else process.env.VIRUS_SCAN_DRIVER = original.VIRUS_SCAN_DRIVER;
    if (original.CLAMAV_DB_PATH === undefined) delete process.env.CLAMAV_DB_PATH;
    else process.env.CLAMAV_DB_PATH = original.CLAMAV_DB_PATH;
  });

  await withTestDb(async (dbPath) => {
    process.env.VIRUS_SCAN_DRIVER = "clamav";
    process.env.CLAMAV_DB_PATH = dbPath;
    assert.equal(await scanForViruses(EICAR), "infected");
  });
});

test("scanForViruses reports an ordinary document as clean against the same real scanner", async (t) => {
  if (!clamscanAvailable()) {
    t.skip("clamscan not installed on this machine");
    return;
  }
  const original = { VIRUS_SCAN_DRIVER: process.env.VIRUS_SCAN_DRIVER, CLAMAV_DB_PATH: process.env.CLAMAV_DB_PATH };
  t.after(() => {
    if (original.VIRUS_SCAN_DRIVER === undefined) delete process.env.VIRUS_SCAN_DRIVER;
    else process.env.VIRUS_SCAN_DRIVER = original.VIRUS_SCAN_DRIVER;
    if (original.CLAMAV_DB_PATH === undefined) delete process.env.CLAMAV_DB_PATH;
    else process.env.CLAMAV_DB_PATH = original.CLAMAV_DB_PATH;
  });

  await withTestDb(async (dbPath) => {
    process.env.VIRUS_SCAN_DRIVER = "clamav";
    process.env.CLAMAV_DB_PATH = dbPath;
    assert.equal(await scanForViruses(Buffer.from("this is a real quote document, not malware")), "clean");
  });
});

test("scanForViruses surfaces a broken database path as an error rather than silently reporting clean", async (t) => {
  if (!clamscanAvailable()) {
    t.skip("clamscan not installed on this machine");
    return;
  }
  const original = { VIRUS_SCAN_DRIVER: process.env.VIRUS_SCAN_DRIVER, CLAMAV_DB_PATH: process.env.CLAMAV_DB_PATH };
  t.after(() => {
    if (original.VIRUS_SCAN_DRIVER === undefined) delete process.env.VIRUS_SCAN_DRIVER;
    else process.env.VIRUS_SCAN_DRIVER = original.VIRUS_SCAN_DRIVER;
    if (original.CLAMAV_DB_PATH === undefined) delete process.env.CLAMAV_DB_PATH;
    else process.env.CLAMAV_DB_PATH = original.CLAMAV_DB_PATH;
  });

  process.env.VIRUS_SCAN_DRIVER = "clamav";
  process.env.CLAMAV_DB_PATH = "/nonexistent/path/does-not-exist.hdb";
  await assert.rejects(() => scanForViruses(Buffer.from("anything")));
});

test("scanForViruses returns skipped by default, even for the EICAR string, when VIRUS_SCAN_DRIVER is unset", async (t) => {
  const original = process.env.VIRUS_SCAN_DRIVER;
  delete process.env.VIRUS_SCAN_DRIVER;
  t.after(() => {
    if (original === undefined) delete process.env.VIRUS_SCAN_DRIVER;
    else process.env.VIRUS_SCAN_DRIVER = original;
  });

  assert.equal(await scanForViruses(EICAR), "skipped");
});
