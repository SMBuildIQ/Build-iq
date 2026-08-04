export function BlueprintHeroArt() {
  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden animate-drift">
      <svg
        viewBox="0 0 640 520"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="houseFill" x1="80" y1="60" x2="560" y2="460" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1c2b24" stopOpacity="0.08" />
            <stop offset="1" stopColor="#c36b3a" stopOpacity="0.16" />
          </linearGradient>
        </defs>

        {/* site grid */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={40 + i * 50}
            y1={40}
            x2={40 + i * 50}
            y2={480}
            stroke="#14201b"
            strokeOpacity="0.06"
          />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={40}
            y1={40 + i * 48}
            x2={600}
            y2={40 + i * 48}
            stroke="#14201b"
            strokeOpacity="0.06"
          />
        ))}

        {/* foundation */}
        <path
          d="M110 390 H530 V430 H110 Z"
          fill="url(#houseFill)"
          stroke="#14201b"
          strokeWidth="2.5"
          className="[stroke-dasharray:240] animate-[draw-line_1.6s_ease_forwards]"
        />

        {/* main massing */}
        <path
          d="M140 390 V220 L320 110 L500 220 V390 Z"
          fill="url(#houseFill)"
          stroke="#14201b"
          strokeWidth="2.5"
        />
        <path d="M140 220 L320 110 L500 220" stroke="#c36b3a" strokeWidth="3" />

        {/* garage wing */}
        <path
          d="M500 390 V270 H580 V390 Z"
          fill="url(#houseFill)"
          stroke="#14201b"
          strokeWidth="2"
        />
        <path d="M500 270 L540 230 L580 270" stroke="#c36b3a" strokeWidth="2.5" />

        {/* windows */}
        <rect x="190" y="250" width="54" height="70" rx="2" stroke="#5f7a6a" strokeWidth="2" fill="#f3efe6" fillOpacity="0.5" />
        <rect x="396" y="250" width="54" height="70" rx="2" stroke="#5f7a6a" strokeWidth="2" fill="#f3efe6" fillOpacity="0.5" />
        <line x1="217" y1="250" x2="217" y2="320" stroke="#5f7a6a" strokeWidth="1.5" />
        <line x1="423" y1="250" x2="423" y2="320" stroke="#5f7a6a" strokeWidth="1.5" />

        {/* door */}
        <path d="M290 390 V310 H350 V390" stroke="#14201b" strokeWidth="2.5" fill="#c36b3a" fillOpacity="0.25" />

        {/* dimension callouts */}
        <path d="M140 450 H500" stroke="#c36b3a" strokeWidth="1.5" strokeOpacity="0.7" />
        <path d="M140 442 V458 M500 442 V458" stroke="#c36b3a" strokeWidth="1.5" />
        <text x="300" y="475" textAnchor="middle" fill="#9a4f28" fontSize="14" fontFamily="DM Sans, sans-serif">
          42&apos;-0&quot;
        </text>

        <circle cx="520" cy="140" r="28" stroke="#5f7a6a" strokeWidth="1.5" strokeOpacity="0.5" className="animate-[pulse-soft_4s_ease_infinite]" />
        <text x="520" y="145" textAnchor="middle" fill="#2a3b33" fontSize="11" fontFamily="DM Sans, sans-serif">
          AI
        </text>
      </svg>
    </div>
  );
}
