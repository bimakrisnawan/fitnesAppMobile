"use client";

import { CalendarDays, ClipboardList, Dumbbell, LayoutDashboard, Library, LogOut, Menu, Users, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { useConfirm } from "@/components/feedback";
import { Avatar } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { TRACK } from "@/lib/format";
import { useApi } from "@/lib/useApi";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
}

const SECTIONS: { title?: string; items: NavItem[] }[] = [
  { items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "1-on-1 coaching",
    items: [
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/plans", label: "Training plans", icon: ClipboardList },
      { href: "/sessions", label: "Sessions", icon: CalendarDays },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/workouts", label: "Workout library", icon: Dumbbell, hint: "Monthly" },
      { href: "/exercises", label: "Exercise library", icon: Library },
    ],
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { me, status, logout } = useAuth();
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Small badge so new paying clients never go unnoticed.
  const waiting = useApi<{ clients: unknown[] }>(status === "signedIn" ? "/coach/clients/unassigned" : null);

  useEffect(() => {
    if (status === "signedOut") router.replace("/login");
  }, [status, router]);

  if (status !== "signedIn" || !me) {
    return (
      <div className="login-form-wrap" style={{ minHeight: "100vh" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const waitingCount = waiting.data?.clients.length ?? 0;

  return (
    <div className="shell">
      <div className="mobile-bar">
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <strong>FitCoach</strong>
      </div>
      <aside className={`sidebar ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
        <div className="brand">
          <span className="brand-logo">
            <Zap size={18} />
          </span>
          <div>
            FitCoach
            <div className="muted small" style={{ fontWeight: 600 }}>
              Coach dashboard
            </div>
          </div>
        </div>
        {SECTIONS.map((section, i) => (
          <div key={i}>
            {section.title && <div className="nav-section">{section.title}</div>}
            {section.items.map((n) => (
              <Link key={n.href} href={n.href} className={`nav ${isActive(n.href) ? "active" : ""}`}>
                <n.icon size={18} />
                <span className="nav-label">{n.label}</span>
                {n.hint && <span className="nav-hint">{n.hint}</span>}
                {n.href === "/" && waitingCount > 0 && <span className="nav-count" title="New clients waiting">{waitingCount}</span>}
              </Link>
            ))}
          </div>
        ))}
        <div className="sidebar-foot">
          <Avatar name={me.fullName} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="strong ellipsis">{me.fullName}</div>
            <div className="muted small ellipsis">{me.coachProfile ? `${TRACK[me.coachProfile.specialization]} coach` : me.role}</div>
          </div>
          <button
            className="icon-btn"
            aria-label="Log out"
            title="Log out"
            onClick={async () => {
              if (await confirm({ title: "Log out?", confirmLabel: "Log out" })) await logout();
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
