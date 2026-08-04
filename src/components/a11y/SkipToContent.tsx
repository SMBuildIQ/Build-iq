export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--ink)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--paper)]"
    >
      Skip to content
    </a>
  );
}
