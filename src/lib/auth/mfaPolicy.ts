// KNOWN_LIMITATIONS.md flagged this as a real, scoped follow-up: MFA is
// opt-in per user, with no org-admin policy that can require it. This is
// that policy — a pure predicate so both the app-shell enrollment gate
// (src/app/(app)/mfa-gate.tsx) and the disable-MFA route can share one
// definition instead of duplicating the condition.

export function isMfaEnrollmentRequired(organization: { requireMfa: boolean }, user: { mfaEnabled: boolean }): boolean {
  return organization.requireMfa && !user.mfaEnabled;
}
