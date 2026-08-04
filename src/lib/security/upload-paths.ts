import { promises as fs } from "fs";
import path from "path";

export function uploadDir() {
  return path.join(process.cwd(), "uploads");
}

export function uploadFilePath(filename: string) {
  // Filenames are server-generated (`projectId-uuid.ext`) — still guard traversal.
  const base = path.basename(filename);
  if (base !== filename || filename.includes("..")) {
    throw new Error("Invalid upload filename");
  }
  return path.join(uploadDir(), base);
}

/** Best-effort unlink of blueprint files from disk. */
export async function deleteUploadFiles(filenames: string[]) {
  await Promise.all(
    filenames.map(async (filename) => {
      try {
        await fs.unlink(uploadFilePath(filename));
      } catch {
        // Missing file is fine during cleanup
      }
    })
  );
}
