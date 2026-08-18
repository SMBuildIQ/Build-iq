import { test } from "node:test";
import assert from "node:assert/strict";
import * as OTPAuth from "otpauth";
import { generateTotpSecret, buildTotpUri, verifyTotpCode, generateBackupCodes, hashBackupCode } from "../src/lib/auth/mfa";
import { encryptSecret, decryptSecret } from "../src/lib/auth/crypto";

test("generateTotpSecret produces a usable base32 secret", () => {
  const secret = generateTotpSecret();
  assert.match(secret, /^[A-Z2-7]+=*$/); // valid base32 alphabet
  assert.notEqual(secret, generateTotpSecret()); // not a fixed/hardcoded value
});

test("buildTotpUri encodes the issuer and account email into a real otpauth:// URI", () => {
  const secret = generateTotpSecret();
  const uri = buildTotpUri("buyer@example.com", secret);
  assert.match(uri, /^otpauth:\/\/totp\//);
  assert.match(uri, /buyer%40example\.com|buyer@example\.com/);
  assert.match(uri, /BuildIQ/);
});

test("verifyTotpCode accepts a code actually generated from the same secret", () => {
  const secret = generateTotpSecret();
  const totp = new OTPAuth.TOTP({ algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
  const validCode = totp.generate();
  assert.equal(verifyTotpCode(secret, validCode), true);
});

test("verifyTotpCode rejects a code generated from a different secret", () => {
  const secretA = generateTotpSecret();
  const secretB = generateTotpSecret();
  const totpB = new OTPAuth.TOTP({ algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secretB) });
  assert.equal(verifyTotpCode(secretA, totpB.generate()), false);
});

test("verifyTotpCode rejects garbage input rather than throwing", () => {
  const secret = generateTotpSecret();
  assert.equal(verifyTotpCode(secret, "000000"), false);
  assert.equal(verifyTotpCode(secret, "not-a-code"), false);
});

test("generateBackupCodes produces 10 unique codes", () => {
  const codes = generateBackupCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
});

test("hashBackupCode is deterministic and case/whitespace-insensitive, but distinguishes different codes", () => {
  const codes = generateBackupCodes();
  const [a, b] = codes;
  assert.equal(hashBackupCode(a), hashBackupCode(a));
  assert.equal(hashBackupCode(a), hashBackupCode(` ${a.toUpperCase()} `));
  assert.notEqual(hashBackupCode(a), hashBackupCode(b));
});

test("encryptSecret/decryptSecret round-trips the original plaintext", () => {
  const secret = generateTotpSecret();
  const ciphertext = encryptSecret(secret);
  assert.notEqual(ciphertext, secret); // never stored in plaintext
  assert.equal(decryptSecret(ciphertext), secret);
});

test("encryptSecret produces a different ciphertext each time (random IV) even for the same plaintext", () => {
  const secret = generateTotpSecret();
  const a = encryptSecret(secret);
  const b = encryptSecret(secret);
  assert.notEqual(a, b);
  assert.equal(decryptSecret(a), secret);
  assert.equal(decryptSecret(b), secret);
});

test("decryptSecret rejects a tampered ciphertext rather than silently returning wrong data", () => {
  const secret = generateTotpSecret();
  const ciphertext = encryptSecret(secret);
  const [iv, tag, data] = ciphertext.split(".");
  const tampered = [iv, tag, Buffer.from(data, "base64").fill(0).toString("base64")].join(".");
  assert.throws(() => decryptSecret(tampered));
});
