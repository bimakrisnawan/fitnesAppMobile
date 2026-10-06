import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "success" | "warn" | "danger" | "info" | "primary";

export function Badge({ tone, children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge ${tone ?? ""}`}>{children}</span>;
}

const STATUS: Record<string, { tone?: Tone; label: string }> = {
  ACTIVE: { tone: "success", label: "Active" },
  SCHEDULED: { tone: "info", label: "Scheduled" },
  COMPLETED: { tone: "success", label: "Done" },
  CANCELLED: { tone: "danger", label: "Cancelled" },
  PAUSED: { tone: "warn", label: "Paused" },
  EXPIRED: { tone: "danger", label: "Expired" },
  DRAFT: { tone: "warn", label: "Draft" },
  ARCHIVED: { label: "Archived" },
  PENDING: { tone: "warn", label: "Pending" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {letters}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="stack" style={{ gap: 10 }} aria-busy="true" aria-label={label}>
      <div className="skeleton" style={{ height: 22, width: "40%" }} />
      <div className="skeleton" style={{ height: 90 }} />
      <div className="skeleton" style={{ height: 90 }} />
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="alert">{message}</div>;
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  badge,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div style={{ minWidth: 0 }}>
        {back && (
          <Link className="crumb" href={back.href}>
            ← {back.label}
          </Link>
        )}
        <div className="row" style={{ gap: 10 }}>
          <h1>{title}</h1>
          {badge}
        </div>
        {subtitle && <div className="muted page-sub">{subtitle}</div>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = "primary", href }: { icon: LucideIcon; label: string; value: ReactNode; hint?: ReactNode; tone?: Tone; href?: string }) {
  const body = (
    <div className={`card stat ${href ? "hoverable" : ""}`}>
      <div className={`stat-icon ${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="muted small">{label}</div>
        {hint && <div className="small" style={{ marginTop: 2 }}>{hint}</div>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={26} />
      </div>
      <strong>{title}</strong>
      {body && <div className="muted small" style={{ maxWidth: 380 }}>{body}</div>}
      {action}
    </div>
  );
}

export function Progress({ value, tone = "success" }: { value: number; tone?: "success" | "primary" }) {
  return (
    <div className="progress">
      <div style={{ width: `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`, background: `var(--${tone})` }} />
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
