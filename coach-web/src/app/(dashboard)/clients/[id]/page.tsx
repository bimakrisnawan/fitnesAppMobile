"use client";

import { Activity, CalendarClock, CalendarDays, ClipboardList, Mail, MapPin, Plus, Target, Video } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/feedback";
import { NewPlanForm } from "@/components/NewPlanForm";
import { ScheduleForm } from "@/components/ScheduleForm";
import { Avatar, Badge, EmptyState, ErrorBox, Loading, Progress, StatusBadge, Tabs } from "@/components/ui";
import { DAYS, describeLog, formatDate, formatDateTime, LEVEL, timeAgo, TRACK } from "@/lib/format";
import type { Log, Plan, Session } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useNow } from "@/lib/useNow";

interface ClientDetail {
  client: { id: string; fullName: string; email: string; birthYear: number | null; fitnessLevel: string | null; goals: string | null; preferredSpecialization: string | null; createdAt: string };
  subscription: { status: string; specialization: string | null; currentPeriodEnd: string | null } | null;
  plans: { id: string; title: string; status: string; specialization: string; startDate: string; _count: { exercises: number } }[];
  logs: (Log & { exercise: { name: string; weekNumber: number; dayOfWeek: number } })[];
  sessions: Session[];
  libraryWorkouts: { id: string; completedAt: string; workout: { title: string } }[];
}

type TabId = "overview" | "log" | "sessions" | "plans";

function SessionRow({ s }: { s: Session }) {
  return (
    <div className="list-item">
      <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
        <div className="todo-icon" style={{ background: "var(--info-soft)", color: "var(--info)" }}>
          {s.type === "ONLINE" ? <Video size={16} /> : <MapPin size={16} />}
        </div>
        <div>
          <div className="row" style={{ gap: 6 }}>
            <strong>{formatDateTime(s.startsAt)}</strong> <StatusBadge status={s.status} />
          </div>
          <div className="muted small">
            {s.type === "ONLINE" ? "Google Meet" : s.location} · {s.durationMinutes} min
          </div>
          {s.notes && <div className="small">{s.notes}</div>}
        </div>
      </div>
      {s.status === "SCHEDULED" && s.meetUrl && (
        <a className="btn sm" href={s.meetUrl} target="_blank" rel="noreferrer">
          <Video size={14} /> Join
        </a>
      )}
    </div>
  );
}

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi<ClientDetail>(`/coach/clients/${id}`);
  const activeId = data?.plans.find((p) => p.status === "ACTIVE")?.id;
  const activePlan = useApi<{ plan: Plan }>(activeId ? `/coach/plans/${activeId}` : null);
  const [tab, setTab] = useState<TabId>("overview");
  const [modal, setModal] = useState<"plan" | "session" | null>(null);
  const now = useNow();

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Client not found"} />;
  const { client, subscription, plans, logs, sessions, libraryWorkouts } = data;
  const plan = activePlan.data?.plan;
  const upcoming = sessions.filter((s) => s.status === "SCHEDULED" && new Date(s.endsAt).getTime() > now).reverse();
  const past = sessions.filter((s) => !upcoming.includes(s));
  const thisWeek = plan ? plan.exercises.filter((e) => e.weekNumber === plan.currentWeek) : [];
  const thisWeekDone = thisWeek.filter((e) => e.completed).length;

  return (
    <div className="stack" style={{ gap: 18 }}>
      <Link className="crumb" href="/clients">
        ← Clients
      </Link>

      <div className="card row" style={{ gap: 16, alignItems: "center", justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
          <Avatar name={client.fullName} size={56} />
          <div>
            <h1>{client.fullName}</h1>
            <div className="row muted small" style={{ gap: 12, marginTop: 2 }}>
              <span className="row" style={{ gap: 4 }}>
                <Mail size={13} /> {client.email}
              </span>
              {client.birthYear && <span>{new Date().getFullYear() - client.birthYear} years old</span>}
              {client.fitnessLevel && <span>{LEVEL[client.fitnessLevel]}</span>}
              <span>Member since {formatDate(client.createdAt)}</span>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              {subscription && <StatusBadge status={subscription.status} />}
              {subscription?.specialization && <Badge tone="primary">{TRACK[subscription.specialization]}</Badge>}
              {subscription?.currentPeriodEnd && <span className="muted small">paid until {formatDate(subscription.currentPeriodEnd)}</span>}
            </div>
          </div>
        </div>
        <div className="row">
          {activeId && (
            <Link className="btn" href={`/plans/${activeId}`}>
              <ClipboardList size={16} /> Open plan
            </Link>
          )}
          <button className="btn" onClick={() => setModal("plan")}>
            <Plus size={16} /> New plan
          </button>
          <button className="btn primary" onClick={() => setModal("session")}>
            <CalendarClock size={16} /> Schedule session
          </button>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: "Overview" },
          { value: "log", label: `Training log (${logs.length})` },
          { value: "sessions", label: `Sessions (${sessions.length})` },
          { value: "plans", label: `Plans (${plans.length})` },
        ]}
      />

      {tab === "overview" && (
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <div className="stack" style={{ gap: 16 }}>
            <div className="card stack">
              <div className="row" style={{ gap: 8 }}>
                <Target size={18} color="var(--primary)" />
                <h2>Goal</h2>
              </div>
              <div style={{ fontSize: 16 }}>{client.goals ?? <span className="muted">No goal written yet. Ask about it in your next session.</span>}</div>
            </div>

            <div className="card stack">
              <div className="spread">
                <div className="row" style={{ gap: 8 }}>
                  <ClipboardList size={18} color="var(--primary)" />
                  <h2>Active plan</h2>
                </div>
                {plan && (
                  <Link className="btn sm" href={`/plans/${plan.id}`}>
                    Open builder
                  </Link>
                )}
              </div>
              {!activeId ? (
                <EmptyState icon={ClipboardList} title="No active plan" body={`${client.fullName.split(" ")[0]} is waiting for their training plan.`} action={<button className="btn primary sm" onClick={() => setModal("plan")}>Build a plan</button>} />
              ) : !plan ? (
                <div className="skeleton" style={{ height: 80 }} />
              ) : (
                <>
                  <div>
                    <strong>{plan.title}</strong>
                    <div className="muted small">
                      Week {plan.currentWeek} of {plan.totalWeeks} · started {formatDate(plan.startDate)}
                    </div>
                  </div>
                  <div className="stack" style={{ gap: 4 }}>
                    <div className="spread small">
                      <span>This week</span>
                      <strong>
                        {thisWeekDone}/{thisWeek.length} done
                      </strong>
                    </div>
                    <Progress value={thisWeek.length ? thisWeekDone / thisWeek.length : 0} tone="primary" />
                  </div>
                  <div className="stack" style={{ gap: 4 }}>
                    <div className="spread small">
                      <span>Whole plan</span>
                      <strong>
                        {plan.progress.completed}/{plan.progress.total} done
                      </strong>
                    </div>
                    <Progress value={plan.progress.total ? plan.progress.completed / plan.progress.total : 0} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="stack" style={{ gap: 16 }}>
            <div className="card">
              <div className="card-head">
                <div className="row" style={{ gap: 8 }}>
                  <CalendarDays size={18} color="var(--primary)" />
                  <h2>Upcoming sessions</h2>
                </div>
              </div>
              {upcoming.length ? upcoming.map((s) => <SessionRow key={s.id} s={s} />) : <EmptyState icon={CalendarDays} title="No session booked" action={<button className="btn sm primary" onClick={() => setModal("session")}>Schedule one</button>} />}
            </div>
            <div className="card">
              <div className="card-head">
                <div className="row" style={{ gap: 8 }}>
                  <Activity size={18} color="var(--primary)" />
                  <h2>Latest training</h2>
                </div>
                {logs.length > 4 && (
                  <button className="btn ghost sm" onClick={() => setTab("log")}>
                    See all
                  </button>
                )}
              </div>
              {!logs.length ? (
                <EmptyState icon={Activity} title="Nothing logged yet" />
              ) : (
                logs.slice(0, 4).map((l) => (
                  <div className="list-item" key={l.id}>
                    <div>
                      <strong>{l.exercise.name}</strong>
                      <div className="muted small">{describeLog(l)}</div>
                      {l.notes && <div className="small">“{l.notes}”</div>}
                    </div>
                    <span className="muted small">{timeAgo(l.completedAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "log" && (
        <div className="card flush">
          {!logs.length ? (
            <EmptyState icon={Activity} title="Nothing logged yet" body="Logs appear when the client marks plan exercises as done in the app." />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Planned for</th>
                  <th>Result</th>
                  <th>Client&apos;s note</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="strong">{l.exercise.name}</td>
                    <td className="muted small">
                      Week {l.exercise.weekNumber} · {DAYS[l.exercise.dayOfWeek - 1]}
                    </td>
                    <td>{describeLog(l)}</td>
                    <td className="small">{l.notes ?? <span className="muted">—</span>}</td>
                    <td className="muted small">{formatDateTime(l.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!!libraryWorkouts.length && (
            <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
              <h3 style={{ marginBottom: 6 }}>Library workouts done</h3>
              {libraryWorkouts.map((w) => (
                <div className="list-item" key={w.id}>
                  <span>{w.workout.title}</span>
                  <span className="muted small">{timeAgo(w.completedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "sessions" && (
        <div className="card">
          <div className="card-head">
            <h2>All sessions</h2>
            <button className="btn primary sm" onClick={() => setModal("session")}>
              <Plus size={14} /> Schedule
            </button>
          </div>
          {!sessions.length ? <EmptyState icon={CalendarDays} title="No sessions yet" /> : [...upcoming, ...past].map((s) => <SessionRow key={s.id} s={s} />)}
        </div>
      )}

      {tab === "plans" && (
        <div className="card">
          <div className="card-head">
            <h2>Training plans</h2>
            <button className="btn primary sm" onClick={() => setModal("plan")}>
              <Plus size={14} /> New plan
            </button>
          </div>
          {!plans.length ? (
            <EmptyState icon={ClipboardList} title="No plans yet" />
          ) : (
            plans.map((p) => (
              <Link href={`/plans/${p.id}`} className="list-item" key={p.id}>
                <div>
                  <div className="row" style={{ gap: 6 }}>
                    <strong>{p.title}</strong> <StatusBadge status={p.status} />
                  </div>
                  <div className="muted small">
                    {TRACK[p.specialization]} · starts {formatDate(p.startDate)} · {p._count.exercises} items
                  </div>
                </div>
                <span className="btn sm">{p.status === "DRAFT" ? "Continue building" : "Open"}</span>
              </Link>
            ))
          )}
        </div>
      )}

      <Modal open={modal === "plan"} onClose={() => setModal(null)} title={`New plan for ${client.fullName}`}>
        <NewPlanForm
          clients={[{ id: client.id, fullName: client.fullName, specialization: subscription?.specialization ?? client.preferredSpecialization, goals: client.goals }]}
          initialClientId={client.id}
          onCancel={() => setModal(null)}
        />
      </Modal>
      <Modal open={modal === "session"} onClose={() => setModal(null)} title={`Schedule a session with ${client.fullName}`}>
        <ScheduleForm
          clients={[client]}
          fixedClientId={client.id}
          planId={activeId}
          onDone={() => {
            setModal(null);
            void reload();
          }}
        />
      </Modal>
    </div>
  );
}
