"use client";

import { useState } from "react";
import { BACK, FRONT, MUSCLE_LABEL, type MuscleId, SILHOUETTE } from "@/lib/body-map-data";

export interface MuscleSelection {
  primary: string[];
  secondary: string[];
}

interface Props {
  value: MuscleSelection;
  /** Omit for a read-only map. */
  onChange?: (next: MuscleSelection) => void;
  height?: number;
}

/** Click cycle: none → main focus → also works → none. */
export function cycleMuscle(value: MuscleSelection, id: string): MuscleSelection {
  const primary = value.primary.filter((m) => m !== id);
  const secondary = value.secondary.filter((m) => m !== id);
  if (value.primary.includes(id)) return { primary, secondary: [...secondary, id] };
  if (value.secondary.includes(id)) return { primary, secondary };
  return { primary: [...primary, id], secondary };
}

function Figure({
  regions,
  value,
  onToggle,
  hover,
  setHover,
  height,
  label,
}: {
  regions: Partial<Record<MuscleId, string[]>>;
  value: MuscleSelection;
  onToggle?: (id: MuscleId) => void;
  hover: MuscleId | null;
  setHover: (id: MuscleId | null) => void;
  height: number;
  label: string;
}) {
  const fill = (id: MuscleId) =>
    value.primary.includes(id) ? "var(--primary)" : value.secondary.includes(id) ? "var(--muscle-soft)" : hover === id && onToggle ? "var(--muscle-hover)" : "var(--muscle-idle)";
  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg width={height / 2} height={height} viewBox="0 0 200 400" role="img" aria-label={`${label} muscle map`}>
        <circle cx={100} cy={30} r={18} fill="var(--body)" />
        <rect x={92} y={44} width={16} height={16} rx={4} fill="var(--body)" />
        {SILHOUETTE.map((d, i) => (
          <g key={i} fill="var(--body)">
            <path d={d} />
            <path d={d} transform="translate(200 0) scale(-1 1)" />
          </g>
        ))}
        <ellipse cx={36} cy={210} rx={7} ry={10} fill="var(--body)" />
        <ellipse cx={164} cy={210} rx={7} ry={10} fill="var(--body)" />
        <ellipse cx={78} cy={386} rx={11} ry={7} fill="var(--body)" />
        <ellipse cx={122} cy={386} rx={11} ry={7} fill="var(--body)" />
        {(Object.entries(regions) as [MuscleId, string[]][]).map(([id, paths]) => (
          <g
            key={id}
            fill={fill(id)}
            stroke="var(--surface)"
            strokeWidth={1}
            style={{ cursor: onToggle ? "pointer" : "default", transition: "fill .12s" }}
            onClick={onToggle ? () => onToggle(id) : undefined}
            onMouseEnter={() => setHover(id)}
            onMouseLeave={() => setHover(null)}
          >
            <title>{MUSCLE_LABEL[id]}</title>
            {paths.map((d, i) => (
              <g key={i}>
                <path d={d} />
                <path d={d} transform="translate(200 0) scale(-1 1)" />
              </g>
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="muted small">{label}</figcaption>
    </figure>
  );
}

export function BodyMap({ value, onChange, height = 260 }: Props) {
  const [hover, setHover] = useState<MuscleId | null>(null);
  const toggle = onChange ? (id: MuscleId) => onChange(cycleMuscle(value, id)) : undefined;
  const names = (ids: string[]) => ids.map((m) => MUSCLE_LABEL[m as MuscleId] ?? m).join(", ") || "—";
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: "center", gap: 24 }}>
        <Figure regions={FRONT} value={value} onToggle={toggle} hover={hover} setHover={setHover} height={height} label="Front" />
        <Figure regions={BACK} value={value} onToggle={toggle} hover={hover} setHover={setHover} height={height} label="Back" />
      </div>
      <div className="small" style={{ minHeight: 18, textAlign: "center" }}>
        {hover ? <strong>{MUSCLE_LABEL[hover]}</strong> : onChange ? <span className="muted">Click a muscle: once = main focus, twice = also works, three times = clear</span> : null}
      </div>
      <div className="small">
        <span className="legend-dot" style={{ background: "var(--primary)" }} /> <strong>Main focus:</strong> {names(value.primary)}
        <br />
        <span className="legend-dot" style={{ background: "var(--muscle-soft)" }} /> <strong>Also works:</strong> {names(value.secondary)}
      </div>
    </div>
  );
}

/** Compact text badges for lists. */
export function MuscleBadges({ primary }: { primary: string[] }) {
  if (!primary.length) return null;
  return (
    <span className="small" style={{ color: "var(--primary)", fontWeight: 600 }}>
      {primary.map((m) => MUSCLE_LABEL[m as MuscleId] ?? m).join(" · ")}
    </span>
  );
}
