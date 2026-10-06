"use client";

import { CalendarClock, ClipboardList, Search, TriangleAlert, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, Badge, EmptyState, ErrorBox, Loading, StatusBadge, Tabs } from "@/components/ui";
import { formatDate, LEVEL, timeAgo, TRACK } from "@/lib/format";
import type { ClientRow } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useNow } from "@/lib/useNow";

const DAY = 86_400_000;
const time = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function ClientsPage() {
  const { data, error, loading } = useApi<{ clients: ClientRow[] }>("/coach/clients");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"active" | "all">("active");
  const now = useNow();

  const all = data?.clients ?? [];
  const list = all
    .filter((c) => tab === "all" || c.subscription.status === "ACTIVE")
    .filter((c) => `${c.client.fullName} ${c.client.email}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Clients</h1>
          <div className="muted page-sub">Your 1-on-1 coaching clients. New clients appear on the Dashboard for you to claim.</div>
        </div>
      </div>

      <div className="spread" style={{ flexWrap: "wrap" }}>
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "active", label: `Active (${all.filter((c) => c.subscription.status === "ACTIVE").length})` },
            { value: "all", label: `All (${all.length})` },
          ]}
        />
        <div className="search" style={{ width: 280 }}>
          <Search size={16} />
          <input placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : !list.length ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title={all.length ? "No clients match" : "No clients yet"}
            body={all.length ? "Try another search or show all clients." : "When someone pays for 1-on-1 coaching, they appear on your Dashboard. Claim them to start."}
            action={
              !all.length ? (
                <Link className="btn primary sm" href="/">
                  Go to Dashboard
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {list.map((c) => {
            const quiet = c.activePlan && (!c.lastActivityAt || now - new Date(c.lastActivityAt).getTime() > 3 * DAY);
            return (
              <Link key={c.client.id} href={`/clients/${c.client.id}`} className="card hoverable stack" style={{ gap: 12 }}>
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <Avatar name={c.client.fullName} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="strong ellipsis">{c.client.fullName}</div>
                    <div className="muted small ellipsis">
                      {c.subscription.specialization ? TRACK[c.subscription.specialization] : "Coaching"}
                      {c.client.fitnessLevel ? ` · ${LEVEL[c.client.fitnessLevel]}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={c.subscription.status} />
                </div>
                {c.client.goals && <div className="small ellipsis">🎯 {c.client.goals}</div>}
                <div className="stack" style={{ gap: 6 }}>
                  <div className="row small" style={{ gap: 6 }}>
                    <ClipboardList size={14} className="muted" />
                    {c.activePlan ? <span className="ellipsis">{c.activePlan.title}</span> : <Badge tone="warn">No plan yet</Badge>}
                  </div>
                  <div className="row small" style={{ gap: 6 }}>
                    <CalendarClock size={14} className="muted" />
                    {c.nextSession ? <span>{time(c.nextSession.startsAt)}</span> : <span className="muted">No session booked</span>}
                  </div>
                  <div className="row small" style={{ gap: 6 }}>
                    {quiet ? <TriangleAlert size={14} color="var(--danger)" /> : <span className="dot" style={{ background: "var(--success)", margin: "0 3px" }} />}
                    <span className={quiet ? "" : "muted"} style={quiet ? { color: "var(--danger)" } : undefined}>
                      {c.lastActivityAt ? `Last trained ${timeAgo(c.lastActivityAt)}` : "Hasn't logged training yet"}
                    </span>
                  </div>
                </div>
                {c.subscription.currentPeriodEnd && <div className="muted small">Membership until {formatDate(c.subscription.currentPeriodEnd)}</div>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
