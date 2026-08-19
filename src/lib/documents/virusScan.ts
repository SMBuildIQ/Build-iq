import { spawn } from "node:child_process";

// KNOWN_LIMITATIONS.md previously listed virus scanning as "Not started" —
// Document.virusScanStatus was always hardcoded to "skipped". This wires a
// real driver: VIRUS_SCAN_DRIVER=clamav shells out to a local `clamscan`
// binary (ClamAV's standalone scanner — no daemon required) and streams the
// uploaded bytes to it over stdin, exactly the way it would run against a
// real ClamAV install in production. Unset (the default) preserves the
// original honest "skipped" behavior — no scanner claimed, none run.

export type VirusScanResult = "clean" | "infected" | "skipped";

const CLAMSCAN_BIN = process.env.CLAMSCAN_BIN ?? "clamscan";

export async function scanForViruses(bytes: Buffer): Promise<VirusScanResult> {
  if (process.env.VIRUS_SCAN_DRIVER !== "clamav") return "skipped";

  const args = ["--no-summary", "-"];
  if (process.env.CLAMAV_DB_PATH) args.unshift(`--database=${process.env.CLAMAV_DB_PATH}`);

  return new Promise((resolve, reject) => {
    const proc = spawn(CLAMSCAN_BIN, args);
    let stderr = "";
    proc.stderr.on("data", (chunk) => (stderr += chunk));
    // A missing/unspawnable binary is a real infra misconfiguration, not "no
    // file was infected" — surface it as an error rather than silently
    // reporting scans as clean.
    proc.on("error", (err) => reject(new Error(`clamscan could not be started: ${err.message}`)));
    proc.on("close", (code) => {
      // clamscan exit codes: 0 = clean, 1 = virus(es) found, 2 = error (bad
      // args, unreadable database, etc.) — https://docs.clamav.net/manual/Usage/Scanning.html
      if (code === 0) resolve("clean");
      else if (code === 1) resolve("infected");
      else reject(new Error(`clamscan exited with code ${code}: ${stderr.trim()}`));
    });
    proc.stdin.write(bytes);
    proc.stdin.end();
  });
}
