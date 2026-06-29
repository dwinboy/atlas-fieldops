/**
 * FieldOps Precision empty-state illustrations — small, code-built isometric SVGs used as the
 * centered anchor for empty modules (per the Mission Control "Empty States" principle). Pure,
 * dependency-free, on-palette (emerald #006d44, teal #006a61, mint #93ecb8). ~150px tall.
 */
const E = { emerald: "#006d44", emeraldDeep: "#005232", teal: "#006a61", mint: "#9cf5c1", line: "#bec9bf", surface: "#e7f7f1" } as const;

function Shell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 200 150" className="h-32 w-auto" role="img" aria-label={label}>
      <defs>
        <linearGradient id="es-emerald" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={E.emerald} />
          <stop offset="100%" stopColor={E.emeraldDeep} />
        </linearGradient>
        <radialGradient id="es-glow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor={E.mint} stopOpacity="0.7" />
          <stop offset="100%" stopColor={E.mint} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="120" rx="78" ry="16" fill="url(#es-glow)" />
      {children}
    </svg>
  );
}

/** Generic empty inbox / records — an isometric tray with floating cards. */
export function EmptyDocsArt() {
  return (
    <Shell label="No records yet">
      <polygon points="100,30 150,55 100,80 50,55" fill="#fff" stroke={E.line} />
      <polygon points="100,42 138,61 100,80 62,61" fill={E.surface} stroke={E.line} />
      <g>
        <rect x="78" y="20" width="44" height="30" rx="4" fill="#fff" stroke={E.line} transform="rotate(-8 100 35)" />
        <rect x="84" y="28" width="28" height="3" rx="1.5" fill={E.emerald} opacity="0.6" transform="rotate(-8 100 35)" />
        <rect x="84" y="35" width="20" height="3" rx="1.5" fill={E.line} transform="rotate(-8 100 35)" />
      </g>
      <polygon points="50,55 100,80 100,96 50,71" fill="#fff" stroke={E.line} />
      <polygon points="150,55 100,80 100,96 150,71" fill={E.surface} stroke={E.line} />
    </Shell>
  );
}

/** Empty map — isometric tile with a single pin. */
export function EmptyMapArt() {
  return (
    <Shell label="No map data yet">
      <polygon points="100,34 160,64 100,94 40,64" fill={E.surface} stroke={E.line} />
      <polyline points="64,49 100,67 132,51" fill="none" stroke="#fff" strokeWidth="3" />
      <polyline points="100,67 96,86" fill="none" stroke="#fff" strokeWidth="3" />
      <path d="M100 36 c10 0 16 8 16 16 c0 12 -16 22 -16 22 c0 0 -16 -10 -16 -22 c0 -8 6 -16 16 -16z" fill="url(#es-emerald)" stroke={E.mint} strokeWidth="1" />
      <circle cx="100" cy="52" r="5" fill="#fff" />
    </Shell>
  );
}

/** Empty analytics — isometric panel with faint bars and a flat line. */
export function EmptyChartArt() {
  return (
    <Shell label="No analytics yet">
      <polygon points="100,28 158,60 100,92 42,60" fill="#fff" stroke={E.line} />
      <polygon points="100,40 146,64 100,88 54,64" fill={E.surface} stroke={E.line} />
      <g stroke={E.emerald} strokeWidth="3" strokeLinecap="round" opacity="0.7">
        <line x1="80" y1="70" x2="80" y2="62" />
        <line x1="92" y1="72" x2="92" y2="58" />
        <line x1="104" y1="70" x2="104" y2="54" />
        <line x1="116" y1="68" x2="116" y2="60" />
      </g>
    </Shell>
  );
}
