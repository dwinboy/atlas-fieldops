/**
 * FieldOps Precision illustration library — premium, code-built SVG graphics for the public pages.
 * Pure server components (no client hooks): inline SVG with soft gradients, glassmorphism, isometric
 * hints, and gentle SMIL data-flow animation. Palette is the FieldOps Precision design system:
 * emerald (#005232 / #006d44), teal (#006a61), cyan (#06B6D4), slate (#475569), deep dark (#0C1F1B).
 */
import type { ReactNode } from "react";

const C = {
  emerald: "#005232",
  emeraldBright: "#006d44",
  teal: "#006a61",
  tealSoft: "#6bd8cb",
  mint: "#93ecb8",
  cyan: "#06B6D4",
  slate: "#475569",
  dark: "#0C1F1B",
  line: "#E2E8F0",
  ink: "#101e1a",
} as const;

/** Shared SVG defs: soft card shadow, glass fill, and a glowing teal flow gradient. */
function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-emerald`} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor={C.emeraldBright} />
        <stop offset="100%" stopColor={C.emerald} />
      </linearGradient>
      <linearGradient id={`${id}-flow`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor={C.cyan} />
        <stop offset="100%" stopColor={C.tealSoft} />
      </linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#ecfdf5" stopOpacity="0.85" />
      </linearGradient>
      <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={C.mint} stopOpacity="0.9" />
        <stop offset="100%" stopColor={C.mint} stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor={C.emerald} floodOpacity="0.10" />
      </filter>
    </defs>
  );
}

/** A reusable animated data-flow path (dashed, gently travelling). */
function Flow({ d, id, color, dur = "2.4s" }: { d: string; id: string; color: string; dur?: string }) {
  return (
    <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 9">
      <animate attributeName="stroke-dashoffset" values="22;0" dur={dur} repeatCount="indefinite" />
    </path>
  );
}

function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_10px_40px_-12px_rgba(0,82,50,0.18)]">
      <svg viewBox="0 0 720 440" className="h-auto w-full" role="img" aria-label={label}>
        {children}
      </svg>
    </div>
  );
}

/** A floating glass UI card used across illustrations. */
function Card({ x, y, w, h, id, title, icon }: { x: number; y: number; w: number; h: number; id: string; title: string; icon: ReactNode }) {
  return (
    <g filter={`url(#${id}-shadow)`}>
      <rect x={x} y={y} width={w} height={h} rx="12" fill={`url(#${id}-glass)`} stroke={C.line} />
      <g transform={`translate(${x + 14}, ${y + 14})`}>
        <rect width="26" height="26" rx="7" fill={C.emeraldBright} opacity="0.12" />
        <g transform="translate(5,5)" stroke={C.emerald} strokeWidth="1.6" fill="none">{icon}</g>
      </g>
      <text x={x + 50} y={y + 31} fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" fill={C.ink}>
        {title}
      </text>
    </g>
  );
}

/* ── Home: central operating-platform hub connecting Projects / Forms / Teams / Maps ────────── */
export function HeroEcosystem() {
  const id = "hero";
  return (
    <Frame label="Atlas FieldOps connected operating platform: a central hub linking Projects, Forms, Field Teams, and GIS Maps with live data flows">
      <Defs id={id} />
      <rect width="720" height="440" fill="#FAFAF8" />
      <circle cx="360" cy="220" r="150" fill={`url(#${id}-glow)`} />
      {/* data flows from hub to the four modules */}
      <Flow id={id} d="M360 220 C 250 160, 200 130, 150 110" color={`url(#${id}-flow)`} />
      <Flow id={id} d="M360 220 C 470 160, 520 130, 575 110" color={`url(#${id}-flow)`} dur="2.8s" />
      <Flow id={id} d="M360 220 C 250 285, 200 320, 150 345" color={`url(#${id}-flow)`} dur="3.1s" />
      <Flow id={id} d="M360 220 C 470 285, 520 320, 575 345" color={`url(#${id}-flow)`} dur="2.6s" />
      {/* central hub */}
      <g filter={`url(#${id}-shadow)`}>
        <circle cx="360" cy="220" r="64" fill={`url(#${id}-emerald)`} />
        <circle cx="360" cy="220" r="64" fill="none" stroke={C.mint} strokeWidth="1.5" opacity="0.5" />
        <g transform="translate(338,198)" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="36" height="36" rx="9" />
          <path d="M4 16 H40 M16 4 V40" />
        </g>
      </g>
      <text x="360" y="312" textAnchor="middle" fontFamily="Inter" fontSize="13" fontWeight="700" fill={C.emerald}>Operating Platform</text>
      {/* four module cards */}
      <Card id={id} x={60} y={78} w={150} h={56} title="Projects" icon={<><rect x={0} y={2} width="16" height="13" rx="2" /><path d="M0 6 H6 L8 2" /></>} />
      <Card id={id} x={510} y={78} w={150} h={56} title="Forms" icon={<><rect x={1} y={0} width="14" height="16" rx="2" /><path d="M4 5 H12 M4 9 H12 M4 13 H9" /></>} />
      <Card id={id} x={60} y={312} w={150} h={56} title="Field Teams" icon={<><circle cx="6" cy="5" r="3" /><path d="M1 15 C1 10, 11 10, 11 15" /></>} />
      <Card id={id} x={510} y={312} w={150} h={56} title="GIS Maps" icon={<><path d="M2 3 L7 1 L13 3 L13 14 L7 16 L2 14 Z M7 1 V16" /></>} />
    </Frame>
  );
}

/* ── Platform Architecture: layered isometric stack (Security → Projects → Intelligence) ─────── */
export function PlatformArchitectureStack() {
  const id = "arch";
  const layer = (cy: number, fill: string, label: string, sub: string) => (
    <g>
      <polygon points={`360,${cy} 560,${cy + 56} 360,${cy + 112} 160,${cy + 56}`} fill={fill} stroke="#fff" strokeWidth="1.5" />
      <text x="360" y={cy + 52} textAnchor="middle" fontFamily="Inter" fontSize="13" fontWeight="700" fill="#fff">{label}</text>
      <text x="360" y={cy + 70} textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#ffffff" opacity="0.8">{sub}</text>
    </g>
  );
  return (
    <Frame label="Exploded platform architecture: Security & API at the base, Projects & Forms in the middle, Reports & Intelligence on top, linked by data flows">
      <Defs id={id} />
      <rect width="720" height="440" fill="#FAFAF8" />
      <circle cx="360" cy="220" r="200" fill={`url(#${id}-glow)`} opacity="0.5" />
      {layer(300, C.dark, "Security & API", "Auth · Encryption · Sync")}
      {layer(190, C.teal, "Projects & Forms", "Submissions · Review Queue")}
      {layer(80, C.emeraldBright, "Reports & Intelligence", "Dashboards · Mapping")}
      {/* rising data flows between layers */}
      <Flow id={id} d="M360 300 V 236" color={`url(#${id}-flow)`} />
      <Flow id={id} d="M360 190 V 126" color={`url(#${id}-flow)`} dur="2.7s" />
      {/* floating mini cards */}
      <Card id={id} x={40} y={150} w={140} h={50} title="Submissions" icon={<><rect x={1} y={0} width="14" height="16" rx="2" /><path d="M4 6 H12 M4 10 H9" /></>} />
      <Card id={id} x={540} y={200} w={150} h={50} title="Review Queue" icon={<><path d="M2 8 l4 4 l8 -10" /></>} />
      <Card id={id} x={540} y={92} w={140} h={50} title="Mapping" icon={<><path d="M2 3 L7 1 L13 3 L13 14 L7 16 L2 14 Z" /></>} />
    </Frame>
  );
}

/* ── How It Works: horizontal workflow process ───────────────────────────────────────────────── */
export function WorkflowProcess() {
  const id = "flow";
  const steps = [
    { t: "Create Form", icon: <><rect x="1" y="0" width="14" height="16" rx="2" /><path d="M4 6H12M4 10H9" /></> },
    { t: "Assign Officer", icon: <><circle cx="8" cy="5" r="3" /><path d="M2 15c0-5 12-5 12 0" /></> },
    { t: "Collect Data", icon: <><rect x="3" y="0" width="10" height="16" rx="2" /><path d="M7 13h2" /></> },
    { t: "Review", icon: <><path d="M2 8l4 4 8-9" /></> },
    { t: "Approval", icon: <><circle cx="8" cy="8" r="7" /><path d="M5 8l2 2 4-4" /></> },
  ];
  return (
    <Frame label="Workflow from Create Form to Assign Officer, Collect Data, Supervisor Review, and Approval">
      <Defs id={id} />
      <rect width="720" height="440" fill="#FAFAF8" />
      <Flow id={id} d="M86 220 H 634" color={`url(#${id}-flow)`} dur="3s" />
      {steps.map((s, i) => {
        const x = 60 + i * 130;
        const cx = x + 50;
        const last = i === steps.length - 1;
        return (
          <g key={s.t}>
            <g filter={`url(#${id}-shadow)`}>
              <rect x={x} y="160" width="100" height="120" rx="14" fill={`url(#${id}-glass)`} stroke={C.line} />
            </g>
            <circle cx={cx} cy="200" r="20" fill={last ? `url(#${id}-emerald)` : "#ffffff"} stroke={last ? "none" : C.emeraldBright} strokeWidth="1.6" />
            <g transform={`translate(${cx - 8}, ${192})`} stroke={last ? "#fff" : C.emerald} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round">{s.icon}</g>
            <text x={cx} y="252" textAnchor="middle" fontFamily="Inter" fontSize="11.5" fontWeight="600" fill={C.ink}>{s.t}</text>
            <text x={cx} y="270" textAnchor="middle" fontFamily="Inter" fontSize="10" fontWeight="700" fill={C.teal}>{`0${i + 1}`}</text>
          </g>
        );
      })}
    </Frame>
  );
}

/* ── Offline Collection: phone above Offline DB / GPS / Sync Cloud ───────────────────────────── */
export function OfflineSyncGraphic() {
  const id = "offl";
  return (
    <Frame label="Offline data collection: a mobile device syncing with an offline database, GPS, and the cloud">
      <Defs id={id} />
      <rect width="720" height="440" fill="#FAFAF8" />
      <circle cx="360" cy="150" r="120" fill={`url(#${id}-glow)`} opacity="0.6" />
      {/* phone */}
      <g filter={`url(#${id}-shadow)`}>
        <rect x="312" y="60" width="96" height="180" rx="18" fill="#fff" stroke={C.line} strokeWidth="1.5" />
        <rect x="324" y="84" width="72" height="118" rx="6" fill="#ecfdf5" />
        <rect x="332" y="96" width="56" height="8" rx="4" fill={C.emeraldBright} opacity="0.5" />
        <rect x="332" y="112" width="40" height="6" rx="3" fill={C.slate} opacity="0.3" />
        <rect x="332" y="126" width="48" height="6" rx="3" fill={C.slate} opacity="0.3" />
        <circle cx="360" cy="222" r="6" fill={C.emeraldBright} />
      </g>
      {/* sync flows */}
      <Flow id={id} d="M340 240 C 300 290, 240 300, 175 330" color={`url(#${id}-flow)`} />
      <Flow id={id} d="M360 245 V 320" color={`url(#${id}-flow)`} dur="2.7s" />
      <Flow id={id} d="M380 240 C 420 290, 480 300, 545 330" color={`url(#${id}-flow)`} dur="3s" />
      <Card id={id} x={80} y={330} w={160} h={62} title="Offline DB" icon={<><ellipse cx="8" cy="3" rx="7" ry="2.4" /><path d="M1 3 V 12 c0 1.5 14 1.5 14 0 V3" /></>} />
      <Card id={id} x={280} y={330} w={160} h={62} title="GPS Capture" icon={<><path d="M8 16s6-6 6-10A6 6 0 0 0 2 6c0 4 6 10 6 10z" /><circle cx="8" cy="6" r="2" /></>} />
      <Card id={id} x={480} y={330} w={160} h={62} title="Sync Cloud" icon={<><path d="M4 13h8a3 3 0 0 0 0-7 5 5 0 0 0-9 1 3 3 0 0 0 1 6z" /></>} />
    </Frame>
  );
}

/* ── GIS & Mapping: multi-layer map with polygons, points, villages, layer toggle ────────────── */
export function GisMapGraphic() {
  const id = "gis";
  const toggle = (y: number, label: string, on: boolean) => (
    <g>
      <text x="566" y={y + 4} fontFamily="Inter" fontSize="11" fontWeight="600" fill={C.ink}>{label}</text>
      <rect x="660" y={y - 8} width="30" height="16" rx="8" fill={on ? C.emeraldBright : "#cbd5e1"} />
      <circle cx={on ? 682 : 668} cy={y} r="6" fill="#fff" />
    </g>
  );
  return (
    <Frame label="Interactive GIS map with farm boundary polygons, GPS points, village clusters, and a layer toggle panel">
      <Defs id={id} />
      <rect width="720" height="440" fill="#eef6f2" />
      {/* parcels */}
      <g stroke="#fff" strokeWidth="2">
        <polygon points="40,60 200,40 240,160 90,200" fill="#cfeede" />
        <polygon points="240,160 200,40 380,60 360,200" fill="#bce7d2" />
        <polygon points="90,200 240,160 260,320 120,360" fill="#d7f0e4" />
        <polygon points="360,200 380,60 540,90 520,240" fill="#c4ead7" />
        <polygon points="260,320 360,200 520,240 460,400 280,400" fill={C.mint} opacity="0.55" />
        <polygon points="520,240 540,90 700,120 690,300" fill="#cfeede" />
      </g>
      {/* roads */}
      <path d="M0 230 C 200 200, 360 260, 720 210" fill="none" stroke="#fff" strokeWidth="4" />
      {/* GPS points */}
      {[[170,150],[300,120],[420,170],[250,260],[470,300],[330,330]].map(([x,y]) => (
        <g key={`${x}-${y}`}><circle cx={x} cy={y} r="9" fill={C.teal} opacity="0.18" /><circle cx={x} cy={y} r="3.5" fill={C.teal} /></g>
      ))}
      {/* village markers */}
      {[[120,90,"Village A"],[600,250,"Village B"]].map(([x,y,l]) => (
        <g key={String(l)}>
          <path d={`M${Number(x)} ${Number(y)} s7 -7 7 -12 a7 7 0 0 0 -14 0 c0 5 7 12 7 12z`} fill={C.emerald} />
          <rect x={Number(x) + 10} y={Number(y) - 22} width="74" height="20" rx="6" fill="#fff" stroke={C.line} />
          <text x={Number(x) + 16} y={Number(y) - 8} fontFamily="Inter" fontSize="10" fontWeight="600" fill={C.ink}>{l}</text>
        </g>
      ))}
      {/* layer toggle panel */}
      <g filter={`url(#${id}-shadow)`}>
        <rect x="544" y="28" width="164" height="150" rx="14" fill="rgba(255,255,255,0.92)" stroke={C.line} />
      </g>
      <text x="560" y="52" fontFamily="Inter" fontSize="12" fontWeight="700" fill={C.ink}>Layer Toggle</text>
      {toggle(78, "Farm Boundaries", true)}
      {toggle(108, "GPS Data", true)}
      {toggle(138, "Villages", true)}
      {toggle(166, "Satellite", false)}
    </Frame>
  );
}

/* ── Analytics & KPIs: glassmorphism shards with charts ──────────────────────────────────────── */
export function AnalyticsShards({ dark = false }: { dark?: boolean }) {
  const id = "kpi";
  const bg = dark ? C.dark : "#FAFAF8";
  const glass = dark ? "rgba(255,255,255,0.07)" : `url(#${id}-glass)`;
  const txt = dark ? "#d6e6e0" : C.ink;
  return (
    <Frame label="Analytics dashboard shards: line charts, progress gauges, and a heatmap with emerald and cyan accents">
      <Defs id={id} />
      <rect width="720" height="440" fill={bg} />
      <circle cx="360" cy="220" r="200" fill={`url(#${id}-glow)`} opacity={dark ? 0.4 : 0.6} />
      {/* line chart shard */}
      <g filter={`url(#${id}-shadow)`} transform="rotate(-6 220 170)">
        <rect x="90" y="80" width="260" height="180" rx="16" fill={glass} stroke={dark ? "rgba(255,255,255,0.12)" : C.line} />
        <polyline points="120,210 165,180 210,195 255,140 300,160 330,110" fill="none" stroke={C.emeraldBright} strokeWidth="3" strokeLinecap="round" />
        <polyline points="120,225 165,215 210,220 255,200 300,205 330,185" fill="none" stroke={C.cyan} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        {[120,165,210,255,300,330].map((x)=>(<circle key={x} cx={x} cy={x===330?110:170} r="2.5" fill={C.emeraldBright} opacity="0" />))}
      </g>
      {/* gauge shard */}
      <g filter={`url(#${id}-shadow)`} transform="rotate(5 520 150)">
        <rect x="430" y="70" width="180" height="150" rx="16" fill={glass} stroke={dark ? "rgba(255,255,255,0.12)" : C.line} />
        <circle cx="520" cy="150" r="46" fill="none" stroke={dark ? "rgba(255,255,255,0.12)" : "#e2e8f0"} strokeWidth="10" />
        <circle cx="520" cy="150" r="46" fill="none" stroke={C.emeraldBright} strokeWidth="10" strokeLinecap="round" strokeDasharray="216 290" transform="rotate(-90 520 150)" />
        <text x="520" y="156" textAnchor="middle" fontFamily="Inter" fontSize="22" fontWeight="700" fill={txt}>92%</text>
      </g>
      {/* heatmap shard */}
      <g filter={`url(#${id}-shadow)`} transform="rotate(3 360 350)">
        <rect x="210" y="280" width="300" height="120" rx="16" fill={glass} stroke={dark ? "rgba(255,255,255,0.12)" : C.line} />
        {Array.from({ length: 7 }).map((_, c) =>
          Array.from({ length: 3 }).map((__, r) => {
            const op = ((c * 3 + r) % 5) / 5 + 0.18;
            return <rect key={`${c}-${r}`} x={228 + c * 38} y={300 + r * 28} width="30" height="20" rx="4" fill={C.teal} opacity={Math.min(op, 0.95)} />;
          }),
        )}
      </g>
    </Frame>
  );
}

/* ── Security Architecture: glowing secure core + control cards ──────────────────────────────── */
export function SecurityCoreGraphic() {
  const id = "sec";
  return (
    <Frame label="Security architecture: a central secure core shield connected to Role Permissions, Audit Logs, Encrypted Database, and Approval Chain">
      <Defs id={id} />
      <rect width="720" height="440" fill="#FAFAF8" />
      <circle cx="360" cy="220" r="150" fill={`url(#${id}-glow)`} />
      {/* pulsing links */}
      <Flow id={id} d="M360 220 L 180 120" color={C.emeraldBright} />
      <Flow id={id} d="M360 220 L 540 120" color={C.emeraldBright} dur="2.7s" />
      <Flow id={id} d="M360 220 L 180 330" color={C.emeraldBright} dur="3s" />
      <Flow id={id} d="M360 220 L 540 330" color={C.emeraldBright} dur="2.5s" />
      {/* shield core */}
      <g filter={`url(#${id}-shadow)`}>
        <path d="M360 158 l54 22 v40 c0 42 -30 64 -54 76 c-24 -12 -54 -34 -54 -76 v-40z" fill={`url(#${id}-emerald)`} stroke={C.mint} strokeWidth="1.5" />
        <path d="M342 222 l12 12 l26 -28" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Card id={id} x={60} y={92} w={170} h={56} title="Role Permissions" icon={<><circle cx="6" cy="5" r="3" /><path d="M1 15c0-5 10-5 10 0" /></>} />
      <Card id={id} x={490} y={92} w={170} h={56} title="Audit Logs" icon={<><rect x={1} y={0} width="14" height="16" rx="2" /><path d="M4 5H12M4 9H12M4 13H9" /></>} />
      <Card id={id} x={60} y={302} w={170} h={56} title="Encrypted DB" icon={<><rect x={2} y={6} width="12" height="9" rx="2" /><path d="M5 6V4a3 3 0 0 1 6 0v2" /></>} />
      <Card id={id} x={490} y={302} w={170} h={56} title="Approval Chain" icon={<><circle cx="4" cy="8" r="3" /><circle cx="14" cy="8" r="2" /><path d="M7 8h4" /></>} />
    </Frame>
  );
}

/* ── Agriculture: farm boundaries + registry/monitoring cards ────────────────────────────────── */
export function AgricultureGraphic() {
  const id = "agri";
  return (
    <Frame label="Agriculture: farm boundary polygons with farmer registry and crop monitoring panels">
      <Defs id={id} />
      <rect width="720" height="440" fill="#eef6f2" />
      <g stroke="#fff" strokeWidth="2">
        <polygon points="60,90 250,60 300,220 110,260" fill="#bce7d2" />
        <polygon points="300,220 250,60 470,80 430,260" fill={C.mint} opacity="0.6" />
        <polygon points="110,260 300,220 330,400 150,400" fill="#cfeede" />
        <polygon points="430,260 470,80 660,110 640,340" fill="#c4ead7" />
      </g>
      {/* crop rows texture */}
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1={330 + i * 18} y1="240" x2={310 + i * 18} y2="380" stroke={C.emerald} strokeWidth="1" opacity="0.25" />
      ))}
      {[[180,160],[360,150],[250,320],[540,220]].map(([x,y]) => (
        <g key={`${x}-${y}`}><circle cx={x} cy={y} r="8" fill={C.teal} opacity="0.18" /><circle cx={x} cy={y} r="3" fill={C.teal} /></g>
      ))}
      <Card id={id} x={60} y={40} w={180} h={56} title="Farmer Registry" icon={<><circle cx="6" cy="5" r="3" /><path d="M1 15c0-5 10-5 10 0" /></>} />
      <Card id={id} x={470} y={360} w={190} h={56} title="Crop Monitoring" icon={<><path d="M8 16V6M8 6C8 3 11 1 14 2 14 5 11 7 8 6zM8 8C8 6 5 4 2 5 2 7 5 9 8 8z" /></>} />
    </Frame>
  );
}

/* ── Health: clinics + CHWs + referral flows ─────────────────────────────────────────────────── */
export function HealthOutreachGraphic() {
  const id = "hlth";
  const node = (x: number, y: number, kind: "clinic" | "chw") => (
    <g filter={`url(#${id}-shadow)`}>
      <circle cx={x} cy={y} r="26" fill="#fff" stroke={C.line} />
      <g transform={`translate(${x - 9}, ${y - 9})`} stroke={C.emerald} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {kind === "clinic" ? <><rect x="1" y="3" width="16" height="13" rx="2" /><path d="M9 6v6M6 9h6" /></> : <><circle cx="9" cy="5" r="3" /><path d="M3 16c0-5 12-5 12 0" /></>}
      </g>
    </g>
  );
  return (
    <Frame label="Health outreach: clinics and community health workers connected by referral flows, with patient follow-up and facility assessment panels">
      <Defs id={id} />
      <rect width="720" height="440" fill="#FAFAF8" />
      <circle cx="360" cy="220" r="170" fill={`url(#${id}-glow)`} opacity="0.5" />
      <Flow id={id} d="M180 150 C 280 200, 320 200, 360 220" color={`url(#${id}-flow)`} />
      <Flow id={id} d="M360 220 C 420 240, 470 270, 540 300" color={`url(#${id}-flow)`} dur="2.7s" />
      <Flow id={id} d="M360 220 C 320 280, 250 300, 200 330" color={`url(#${id}-flow)`} dur="3s" />
      {node(180, 150, "clinic")}
      {node(360, 220, "clinic")}
      {node(540, 300, "chw")}
      {node(200, 330, "chw")}
      <Card id={id} x={430} y={70} w={190} h={56} title="Patient Follow-up" icon={<><path d="M8 15S1 11 1 6a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5-7 9-7 9z" /></>} />
      <Card id={id} x={60} y={360} w={200} h={56} title="Facility Assessment" icon={<><path d="M2 8l4 4 8-9" /></>} />
    </Frame>
  );
}
