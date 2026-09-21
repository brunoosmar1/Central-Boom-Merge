import React from "react";
import { X } from "lucide-react";
import { brl } from "./utils";

export const PALETTE = {
  bg: "#F5F7FA",
  card: "#FFFFFF",
  ink: "#1C2126",
  inkSoft: "#5B6472",
  line: "#E4E8EE",
  lineSoft: "#EAEEF3",
  wine: "#2A78D6",
  wineSoft: "#E3EEFC",
  gold: "#EB6834",
  goldSoft: "#FCE7DE",
  ok: "#1BAF7A",
  okSoft: "#DFF5EC",
  pending: "#D03B3B",
  pendingSoft: "#FBE4E4",
  violet: "#4A3AA7",
  violetSoft: "#EBE8F9",
  pink: "#D6368F",
  pinkSoft: "#FBE3F0",
};

export function Card({ children, style }) {
  return (
    <div
      style={{
        background: PALETTE.card, borderRadius: 16, border: `1px solid ${PALETTE.lineSoft}`, padding: 16,
        boxShadow: "0 1px 2px rgba(44,36,34,0.03), 0 8px 20px rgba(142,42,75,0.045)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

export const inputStyle = {
  width: "100%", padding: "9px 10px", borderRadius: 9, border: `1px solid ${PALETTE.line}`,
  fontSize: 16, background: "#FDFAF8", color: PALETTE.ink, boxSizing: "border-box",
};

export function Btn({ children, onClick, variant = "primary", style, type = "button", disabled }) {
  const variants = {
    primary: { background: PALETTE.wine, color: "#fff" },
    ghost: { background: "transparent", color: PALETTE.wine, border: `1px solid ${PALETTE.wine}` },
    subtle: { background: PALETTE.wineSoft, color: PALETTE.wine },
    danger: { background: PALETTE.pendingSoft, color: PALETTE.pending },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "9px 14px", minHeight: 40, borderRadius: 10, border: "none", fontSize: 13.5, fontWeight: 600,
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1,
        touchAction: "manipulation", ...variants[variant], ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Modal({ children, onClose, title }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(44,36,34,0.45)", display: "flex",
        alignItems: "flex-end", justifyContent: "center", zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PALETTE.card, width: "100%", maxWidth: 720, borderRadius: "18px 18px 0 0",
          padding: 20, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 -8px 30px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: PALETTE.wine }}>{title}</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: PALETTE.inkSoft }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Metric({ label, value }) {
  return (
    <div style={{ background: PALETTE.bg, borderRadius: 8, padding: "6px 9px" }}>
      <div style={{ fontSize: 10.5, color: PALETTE.inkSoft }}>{label}</div>
      <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

export function KpiTile({ icon: Icon, tint, label, value }) {
  return (
    <Card style={{ padding: 15 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9, background: PALETTE[`${tint}Soft`],
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
      }}>
        <Icon size={16} color={PALETTE[tint]} />
      </div>
      <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 19, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>{label}</div>
    </Card>
  );
}

// buckets: [{ label, valor }]
export function BarChart({ buckets, color = PALETTE.gold, colorSoft = PALETTE.goldSoft, formatValue = brl }) {
  const w = 300, h = 84, gap = 10;
  const barW = (w - gap * (buckets.length - 1)) / buckets.length;
  const max = Math.max(1, ...buckets.map((s) => s.valor));
  const lastIdx = buckets.length - 1;
  return (
    <svg viewBox={`0 0 ${w} ${h + 16}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      <line x1={0} y1={h} x2={w} y2={h} stroke={PALETTE.line} strokeWidth={1} />
      {buckets.map((s, i) => {
        const barH = Math.max(2, (s.valor / max) * (h - 4));
        const x = i * (barW + gap);
        const active = i === lastIdx;
        return (
          <g key={s.label ?? i}>
            <rect
              x={x} y={h - barH} width={barW} height={barH} rx={3}
              fill={active ? color : colorSoft}
            />
            {active && (
              <text x={x + barW / 2} y={h - barH - 6} textAnchor="middle" fontSize="9" fontWeight="700" fill={PALETTE.ink}>
                {formatValue(s.valor)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// items: [{ label, count, color }]
export function Donut({ items, total, centerLabel }) {
  const size = 116, stroke = 16, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let acc = 0;
  const gap = total > 0 ? 3 : 0;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={PALETTE.lineSoft} strokeWidth={stroke} />
        {items.filter((it) => it.count > 0).map((it) => {
          const len = Math.max(0, (it.count / total) * c - gap);
          const dasharray = `${len} ${c - len}`;
          const dashoffset = -acc;
          acc += (it.count / total) * c;
          return (
            <circle
              key={it.label} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={it.color} strokeWidth={stroke} strokeDasharray={dasharray}
              strokeDashoffset={dashoffset} strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {centerLabel}
      </div>
    </div>
  );
}
