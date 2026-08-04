"use client";

import { useRouter } from "next/navigation";
import { hasPermission } from "@buildiq/permissions";
import { Button } from "@/components/Button";
import { HeroBand } from "@/components/HeroBand";
import { useTheme, type ThemePreference } from "@/components/ThemeProvider";
import { clearAuthCookies } from "@/lib/cookies";
import { mockSession } from "@/lib/mock-data";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { preference, setPreference } = useTheme();
  const canInvite = hasPermission(mockSession.role, "team:invite");
  const canSpruce = hasPermission(mockSession.role, "spruce:configure");

  function signOut() {
    clearAuthCookies();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <HeroBand
        eyebrow="Account"
        title="Settings"
        support="Team, company, Spruce sync, and agent preferences — same chrome, utility pace."
      />

      <div className="bq-content" style={{ paddingTop: 32 }}>
        <section className="bq-section" style={{ marginTop: 0 }}>
          <div className="bq-section-head">
            <h2 className="bq-title">Appearance</h2>
          </div>
          <div className="bq-panel">
            <p className="bq-body" style={{ margin: "0 0 16px", color: "var(--bq-text-secondary)" }}>
              Dark mode uses Millwork Studio tokens via <span className="bq-mono">data-theme</span>.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} role="group" aria-label="Theme">
              {THEME_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={preference === opt.value ? "primary" : "secondary"}
                  compact
                  onClick={() => setPreference(opt.value)}
                  aria-pressed={preference === opt.value}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className="bq-section">
          <div className="bq-section-head">
            <h2 className="bq-title">Company</h2>
          </div>
          <div className="bq-panel">
            <dl style={{ margin: 0, display: "grid", gap: 16 }}>
              <div>
                <dt className="bq-label" style={{ color: "var(--bq-text-muted)" }}>
                  Name
                </dt>
                <dd className="bq-body" style={{ margin: "6px 0 0" }}>
                  {mockSession.companyName}
                </dd>
              </div>
              <div>
                <dt className="bq-label" style={{ color: "var(--bq-text-muted)" }}>
                  Signed in as
                </dt>
                <dd className="bq-body" style={{ margin: "6px 0 0" }}>
                  {mockSession.name} · {mockSession.email}
                </dd>
              </div>
              <div>
                <dt className="bq-label" style={{ color: "var(--bq-text-muted)" }}>
                  Role
                </dt>
                <dd className="bq-body" style={{ margin: "6px 0 0" }}>
                  {mockSession.role.replace(/_/g, " ")}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="bq-section">
          <div className="bq-section-head">
            <h2 className="bq-title">Team</h2>
          </div>
          <div className="bq-muted-panel" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <div className="bq-field" style={{ flex: "1 1 260px" }}>
              <label htmlFor="invite">Invite email</label>
              <input
                id="invite"
                className="bq-input"
                type="email"
                placeholder="estimator@company.com"
                disabled={!canInvite}
              />
            </div>
            <Button variant="primary" type="button" disabled={!canInvite}>
              Send invite
            </Button>
          </div>
        </section>

        <section className="bq-section">
          <div className="bq-section-head">
            <h2 className="bq-title">Spruce</h2>
          </div>
          <div className="bq-panel">
            <p className="bq-body" style={{ margin: "0 0 16px", color: "var(--bq-text-secondary)" }}>
              Sync material SKUs and pricing from Supply Monkey Spruce catalog.
            </p>
            <Button variant="secondary" type="button" disabled={!canSpruce}>
              Connect Spruce
            </Button>
          </div>
        </section>

        <section className="bq-section">
          <div className="bq-section-head">
            <h2 className="bq-title">Agents</h2>
          </div>
          <div className="bq-panel">
            <p className="bq-body" style={{ margin: "0 0 8px", color: "var(--bq-text-secondary)" }}>
              Takeoff agent · Proposal writer · Bid outreach
            </p>
            <p className="bq-mono" style={{ margin: 0, color: "var(--bq-text-muted)" }}>
              Status: demo mode — API wiring via NEXT_PUBLIC_API_URL
            </p>
          </div>
        </section>

        <section className="bq-section">
          <div className="bq-action-row">
            <Button variant="secondary" type="button" onClick={signOut}>
              Sign out
            </Button>
            <Button variant="ghost" type="button" style={{ color: "var(--bq-status-danger)" }}>
              Delete account
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
