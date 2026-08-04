import React from "react";

type BuildIqWordmarkProps = {
  className?: string;
  /** Optional size hint for display contexts */
  size?: "nav" | "display" | "hero";
};

function BananaPeel({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 22"
      width="1em"
      height="0.72em"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M15.2 1.2c.4-.8 1.2-.8 1.6 0l.6 1.4c.2.4 0 .8-.4.9h-2c-.4 0-.6-.5-.4-.9l.6-1.4z"
        fill="#6B4A2A"
      />
      <path
        d="M15.5 3.2c-1.2.2-3.8 1.4-5.8 4.2-2.2 3.1-3.4 7.2-2.6 9.2.4 1 1.6.8 2.2-.2 1.4-2.2 2.8-5.4 4.2-7.6 1-1.6 2-2.8 2.8-3.4-.4-.8-.6-1.6-.8-2.2z"
        fill="#F5C542"
      />
      <path
        d="M15.2 4c-1 .2-3 1.4-4.6 3.6-1.6 2.2-2.6 4.8-2.8 6.2"
        stroke="#E8A317"
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M16 3.1c.2 1.4.4 4.2.2 7.2-.2 2.8-.8 5.6-1.2 7.2-.2.8.4 1.4 1.1 1.1 1.2-.5 2.4-2.8 3-5.6.6-2.8.6-6.2.2-8.4-.6-.8-2-.8-3.3-1.5z"
        fill="#FFE066"
      />
      <path
        d="M16.5 3.2c1.2.2 3.8 1.4 5.8 4.2 2.2 3.1 3.4 7.2 2.6 9.2-.4 1-1.6.8-2.2-.2-1.4-2.2-2.8-5.4-4.2-7.6-1-1.6-2-2.8-2.8-3.4.4-.8.6-1.6.8-2.2z"
        fill="#F0B429"
      />
      <path
        d="M16.8 4c1 .2 3 1.4 4.6 3.6 1.6 2.2 2.6 4.8 2.8 6.2"
        stroke="#D4920F"
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="16" cy="6.5" rx="1.4" ry="2.2" fill="#FFF6C2" opacity="0.55" />
    </svg>
  );
}

/** BUILD in ink + orange IQ with a banana peel on the I. */
export function BuildIqWordmark({ className = "", size = "nav" }: BuildIqWordmarkProps) {
  return (
    <span className={`bq-wordmark bq-wordmark--${size} ${className}`.trim()} aria-label="BuildIQ">
      <span className="bq-wordmark-build">Build</span>
      <span className="bq-wordmark-iq">
        <BananaPeel className="bq-wordmark-banana" />
        <span className="bq-wordmark-iq-letters">IQ</span>
      </span>
    </span>
  );
}
