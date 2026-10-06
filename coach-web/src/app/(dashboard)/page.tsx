"use client";

import { Activity, CalendarClock, CalendarDays, ChevronRight, ClipboardList, MapPin, TriangleAlert, UserPlus, Users, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/feedback";
import { Avatar, Badge, EmptyState, ErrorBox, Loading, StatCard } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { describeLog, LEVEL, timeAgo, TRACK } from "@/lib/format";
import type { ClientBasic, ClientRow, Log, Session } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useNow } from "@/lib/useNow";

interface Dashboard {
  stats: { activeClients: number; unassignedCount: number; sessionsNext7Days: number; logsThisWeek: number };
  upcomingSessions: Session[];
  recentActivity: (Log & { client: { id: string; fullName: string }; exerciseName: string })[];
}

interface Unassigned {
  clients: { client: ClientBasic; subscription: { id: string; specialization: string | null; since: string | null } }[];
}

const DAY = 86_400_000;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(new Date())) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Good morning" : h < 15 ? "Good afternoon" : h < 19 ? "Good evening" : "Good night";
}

export default function DashboardPage() {
  const { me } = useAuth();
  const toast = useToast();
  const dash = useApi<Dashboard>("/coach/dashboard");
  const waiting = useApi<Unassigned>("/coach/clients/unassigned");
  const clients = useApi<{ clients: ClientRow[] }>("/coach/clients");
  const [claiming, setClaiming] = useState<string | null>(null);
  const now = useNow();

  async function claim(clientId: string, name: string) {
    setClaiming(clientId);
    try {
      await api(`/coach/clients/${clientId}/claim`, { method: "POST" });
      toast(`${name} is now your client. Next: build their plan.`);
      await Promise.all([dash.reload(), waiting.reload(), clients.reload()]);
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setClaiming(null);
    }
  }

  if (dash.loading) return <Loading />;
  if (dash.error || !dash.data) return <ErrorBox message={dash.error ?? "Couldn't load dashboard"} />;
  const { stats, upcomingSessions, recentActivity } = dash.data;

  // "Needs your attention": everything a coach should act on, most urgent first.
  const active = (clients.data?.clients ?? []).filter((c) => c.subscription.status === "ACTIVE");
  const noPlan = active.filter((c) => !c.activePlan);
  const quiet = active.filter((c) => c.activePlan && (!c.lastActivityAt || now - new Date(c.lastActivityAt).getTime() > 3 * DAY));
  const noSession = active.filter((c) => c.activePlan && !c.nextSession);
  const todo = (waiting.data?.clients.length ?? 0) + noPlan.length + quiet.length + noSession.length;

  const grouped = upcomingSessions.reduce<Record<string, Session[]>>((acc, s) => {
    (acc[dayLabel(s.startsAt)] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <div className="muted strong small">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1>
            {greeting()}, {me?.fullName.replace(/^Coach\s+/, "").split(" ")[0]} 👋
          </h1>
        </div>
        <div className="row">
          <Link className="btn" href="/plans">
            <ClipboardList size={16} /> Plans
          </Link>
          <Link className="btn primary" href="/sessions?new=1">
            <CalendarClock size={16} /> Schedule session
          </Link>
        </div>
      </div>

      <div className="grid grid-4">
        <StatCard icon={Users} label="Active clients" value={stats.activeClients} href="/clients" />
        <StatCard icon={CalendarDays} label="Sessions in the next 7 days" value={stats.sessionsNext7Days} tone="info" href="/sessions" />
        <StatCard icon={Activity} label="Exercises logged by clients this week" value={stats.logsThisWeek} tone="success" />
        <StatCard icon={UserPlus} label="New clients waiting" value={stats.unassignedCount} tone={stats.unassignedCount ? "warn" : "primary"} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)", alignItems: "start" }}>
        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <h2>Needs your attention</h2>
              {todo > 0 && <Badge tone="warn">{todo}</Badge>}
            </div>
            {todo === 0 ? (
              <EmptyState icon={ClipboardList} title="You're all caught up" body="Every client has a plan, a session booked and recent training." />
            ) : (
              <div className="stack">
                {waiting.data?.clients.map(({ client, subscription }) => (
                  <div className="todo" key={client.id}>
                    <div className="todo-icon" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                      <UserPlus size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div>
                        <strong>{client.fullName}</strong> paid for coaching
                        {subscription.specialization ? (
                          <>
                            {" "}
                            · <Badge tone={subscription.specialization === me?.coachProfile?.specialization ? "primary" : undefined}>{TRACK[subscription.specialization]}</Badge>
                          </>
                        ) : null}
                      </div>
                      <div className="muted small">
                        {client.fitnessLevel ? LEVEL[client.fitnessLevel] : "Level not set"}
                        {subscription.since ? ` · waiting ${timeAgo(subscription.since).replace(" ago", "")}` : ""}
                        {client.goals ? ` · 🎯 ${client.goals}` : ""}
                      </div>
                    </div>
                    <button className="btn primary sm" disabled={claiming === client.id} onClick={() => claim(client.id, client.fullName)}>
                      {claiming === client.id ? "Claiming…" : "Claim client"}
                    </button>
                  </div>
                ))}
                {noPlan.map((c) => (
                  <div className="todo" key={`plan-${c.client.id}`}>
                    <div className="todo-icon" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                      <ClipboardList size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong>{c.client.fullName}</strong> has no training plan yet
                      <div className="muted small">They&apos;re paying and waiting for their plan.</div>
                    </div>
                    <Link className="btn sm" href={`/plans?new=${c.client.id}`}>
                      Build plan
                    </Link>
                  </div>
                ))}
                {quiet.map((c) => (
                  <div className="todo" key={`quiet-${c.client.id}`}>
                    <div className="todo-icon" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                      <TriangleAlert size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong>{c.client.fullName}</strong> hasn&apos;t logged training {c.lastActivityAt ? `for ${timeAgo(c.lastActivityAt).replace(" ago", "")}` : "yet"}
                      <div className="muted small">A quick check-in helps keep them on track.</div>
                    </div>
                    <Link className="btn sm" href={`/clients/${c.client.id}`}>
                      View
                    </Link>
                  </div>
                ))}
                {noSession.map((c) => (
                  <div className="todo" key={`session-${c.client.id}`}>
                    <div className="todo-icon" style={{ background: "var(--info-soft)", color: "var(--info)" }}>
                      <CalendarClock size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      No upcoming session with <strong>{c.client.fullName}</strong>
                      <div className="muted small">1-on-1 clients get a weekly 45-minute call.</div>
                    </div>
                    <Link className="btn sm" href={`/sessions?new=1&client=${c.client.id}`}>
                      Schedule
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Recent client activity</h2>
            </div>
            {!recentActivity.length ? (
              <EmptyState icon={Activity} title="No training logged yet" body="When clients mark exercises as done in the app, they appear here." />
            ) : (
              recentActivity.map((a) => (
                <div className="list-item" key={a.id}>
                  <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                    <Avatar name={a.client.fullName} size={32} />
                    <div>
                      <div>
                        <Link href={`/clients/${a.client.id}`} className="strong">
                          {a.client.fullName}
                        </Link>{" "}
                        did <strong>{a.exerciseName}</strong>
                      </div>
                      <div className="muted small">{describeLog(a)}</div>
                      {a.notes && <div className="small">“{a.notes}”</div>}
                    </div>
                  </div>
                  <span className="muted small" style={{ whiteSpace: "nowrap" }}>
                    {timeAgo(a.completedAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Upcoming sessions</h2>
            <Link className="link small strong" href="/sessions">
              All sessions <ChevronRight size={14} style={{ verticalAlign: "middle" }} />
            </Link>
          </div>
          {!upcomingSessions.length ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing scheduled"
              action={
                <Link className="btn sm primary" href="/sessions?new=1">
                  Schedule a session
                </Link>
              }
            />
          ) : (
            <div className="stack">
              {Object.entries(grouped).map(([day, list]) => (
                <div key={day} className="stack" style={{ gap: 8 }}>
                  <div className="agenda-day">{day}</div>
                  {list.map((s) => (
                    <div key={s.id} className="agenda-item">
                      <div className="agenda-time">{time(s.startsAt)}</div>
                      <div style={{ minWidth: 0 }}>
                        <Link href={`/clients/${s.client?.id}`} className="strong">
                          {s.client?.fullName}
                        </Link>
                        <div className="muted small row" style={{ gap: 4 }}>
                          {s.type === "ONLINE" ? <Video size={13} /> : <MapPin size={13} />}
                          <span className="ellipsis">{s.type === "ONLINE" ? `Google Meet · ${s.durationMinutes} min` : s.location}</span>
                        </div>
                      </div>
                      {s.type === "ONLINE" && s.meetUrl && (
                        <a className="btn sm" href={s.meetUrl} target="_blank" rel="noreferrer">
                          <Video size={14} /> Join
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
