import * as OTPAuth from "otpauth";
import { randomBytes, createHash } from "node:crypto";

const ISSUER = "BuildIQ Purchasing";
const BACKUP_CODE_COUNT = 10;

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

/** otpauth:// URI for an authenticator app to scan (as a QR code) or import directly. */
export function buildTotpUri(email: string, base32Secret: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });
  return totp.toString();
}

/** window: 1 tolerates the previous/next 30s step for clock drift between server and device. */
export function verifyTotpCode(base32Secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });
  return totp.validate({ token: code, window: 1 }) !== null;
}

/** 10 single-use recovery codes, shown to the user exactly once at enrollment. */
export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => randomBytes(5).toString("hex"));
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}
