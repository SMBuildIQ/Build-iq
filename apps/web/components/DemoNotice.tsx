export function DemoNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p
      className="bq-mono"
      style={{
        margin: "0 0 16px",
        color: "var(--bq-text-muted)",
        fontSize: 12,
        letterSpacing: "0.04em",
      }}
      role="status"
    >
      Demo data — API unavailable or unauthenticated
    </p>
  );
}
