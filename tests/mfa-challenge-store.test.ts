import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { consumeMfaChallenge } from "../src/lib/auth/mfaChallengeStore";

// KNOWN_LIMITATIONS.md flagged this as a real gap: the post-password
// mfaToken was a signed JWT, verifiable but not revocable — replayable
// against /auth/mfa/challenge for its whole 5-minute TTL instead of granting
// exactly one guess. consumeMfaChallenge is the fix: a jti burn list backed
// by a real unique-constraint violation at the database level, not an
// application-level check-then-act race.

test("a jti can be consumed exactly once", async () => {
  const jti = randomUUID();
  assert.equal(await consumeMfaChallenge(jti), true);
  assert.equal(await consumeMfaChallenge(jti), false);
  assert.equal(await consumeMfaChallenge(jti), false); // still false, not just "false once"
});

test("different jtis are independent", async () => {
  const jtiA = randomUUID();
  const jtiB = randomUUID();
  assert.equal(await consumeMfaChallenge(jtiA), true);
  assert.equal(await consumeMfaChallenge(jtiB), true);
  assert.equal(await consumeMfaChallenge(jtiA), false);
});

test("concurrent consumption of the same jti lets exactly one caller win — a real DB constraint, not a check-then-act race", async () => {
  const jti = randomUUID();
  const results = await Promise.all(Array.from({ length: 10 }, () => consumeMfaChallenge(jti)));
  assert.equal(results.filter((r) => r === true).length, 1);
  assert.equal(results.filter((r) => r === false).length, 9);
});
