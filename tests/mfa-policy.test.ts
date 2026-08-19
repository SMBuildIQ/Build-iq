import { test } from "node:test";
import assert from "node:assert/strict";
import { isMfaEnrollmentRequired } from "../src/lib/auth/mfaPolicy";

// KNOWN_LIMITATIONS.md flagged this as a real, scoped follow-up: MFA was
// opt-in per user with no org-admin policy that could require it.

test("enrollment is required only when the org requires MFA and this user hasn't enrolled", () => {
  assert.equal(isMfaEnrollmentRequired({ requireMfa: true }, { mfaEnabled: false }), true);
});

test("enrollment is not required when the org doesn't require MFA, regardless of the user's own state", () => {
  assert.equal(isMfaEnrollmentRequired({ requireMfa: false }, { mfaEnabled: false }), false);
  assert.equal(isMfaEnrollmentRequired({ requireMfa: false }, { mfaEnabled: true }), false);
});

test("enrollment is not required once the user has enrolled, even under an org that requires it", () => {
  assert.equal(isMfaEnrollmentRequired({ requireMfa: true }, { mfaEnabled: true }), false);
});
