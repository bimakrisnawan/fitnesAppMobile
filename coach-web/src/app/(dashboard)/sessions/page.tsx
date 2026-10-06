"use client";

import { CalendarDays, Check, Clock, MapPin, Plus, Video, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Modal, useConfirm, useToast } from "@/components/feedback";
import { ScheduleForm } from "@/components/ScheduleForm";
import { Avatar, EmptyState, ErrorBox, Loading, PageHeader, StatusBadge, Tabs } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { toLocalInput } from "@/lib/format";
import type { ClientRow, Session } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useNow } from "@/lib/useNow";

const DAY = 86_400_000;
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function dayLabel(iso: string) {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(new Date())) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function SessionsContent() {
  const params = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const sessions = useApi<{ sessions: Session[] }>(`/coach/sessions?scope=${scope}`);
  const clients = useApi<{ clients: ClientRow[] }>("/coach/clients");
  // Dashboard links: ?new=1 (optionally &client=<id>) open the schedule dialog.
  const [scheduling, setScheduling] = useState(params.get("new") === "1");
  const presetClient = params.get("client") ?? undefined;
  const [rescheduling, setRescheduling] = useState<Session | null>(null);
  const [newTime, setNewTime] = useState("");
  const now = useNow();

  async function update(s: Session, body: Record<string, unknown>, message: string) {
    try {
      await api(`/coach/sessions/${s.id}`, { method: "PUT", body });
      toast(message);
      setRescheduling(null);
      await sessions.reload();
    } catch (err) {
      toast(errorText(err), "error");
    }
  }

  const activeClients = (clients.data?.clients ?? []).filter((c) => c.subscription.status === "ACTIVE").map((c) => c.client);
  // Put the client from the link first, so the form preselects them.
  const ordered = [...activeClients.filter((c) => c.id === presetClient), ...activeClients.filter((c) => c.id !== presetClient)];
  const grouped = (sessions.data?.sessions ?? []).reduce<Record<string, Session[]>>((acc, s) => {
    (acc[dayLabel(s.startsAt)] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="stack" style={{ gap: 16 }}>
      <PageHeader
        title="Sessions"
        subtitle="Weekly 1-on-1 calls and in-person sessions. Clients are notified and reminded the day before."
        actions={
          <button className="btn primary" onClick={() => setScheduling(true)} disabled={!activeClients.length}>
            <Plus size={16} /> Schedule session
          </button>
        }
      />

      <Tabs
        value={scope}
        onChange={setScope}
        options={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
        ]}
      />

      {sessions.loading ? (
        <Loading />
      ) : sessions.error ? (
        <ErrorBox message={sessions.error} />
      ) : !sessions.data?.sessions.length ? (
        <div className="card">
          <EmptyState
            icon={CalendarDays}
            title={scope === "upcoming" ? "Nothing scheduled" : "No past sessions"}
            action={
              scope === "upcoming" && activeClients.length ? (
                <button className="btn primary sm" onClick={() => setScheduling(true)}>
                  Schedule a session
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="stack" style={{ gap: 14 }}>
          {Object.entries(grouped).map(([day, list]) => (
            <div key={day} className="stack" style={{ gap: 8 }}>
              <div className="agenda-day">{day}</div>
              {list.map((s) => {
                const past = new Date(s.endsAt).getTime() < now;
                return (
                  <div key={s.id} className={`agenda-item ${s.status !== "SCHEDULED" ? "past" : ""}`} style={{ gridTemplateColumns: "70px 1fr auto" }}>
                    <div>
                      <div className="agenda-time">{time(s.startsAt)}</div>
                      <div className="muted small">{s.durationMinutes} min</div>
                    </div>
                    <div className="row" style={{ flexWrap: "nowrap", minWidth: 0 }}>
                      {s.client && <Avatar name={s.client.fullName} size={34} />}
                      <div style={{ minWidth: 0 }}>
                        <div className="row" style={{ gap: 6 }}>
                          {s.client && (
                            <Link href={`/clients/${s.client.id}`} className="strong">
                              {s.client.fullName}
                            </Link>
                          )}
                          <StatusBadge status={s.status} />
                        </div>
                        <div className="muted small row" style={{ gap: 4, flexWrap: "nowrap" }}>
                          {s.type === "ONLINE" ? <Video size={13} /> : <MapPin size={13} />}
                          <span className="ellipsis">{s.type === "ONLINE" ? "Google Meet" : s.location}</span>
                          {s.notes && <span className="ellipsis">· {s.notes}</span>}
                        </div>
                      </div>
                    </div>
                    {s.status === "SCHEDULED" && (
                      <div className="row" style={{ justifyContent: "flex-end" }}>
                        {s.type === "ONLINE" && s.meetUrl && !past && (
                          <a className="btn sm primary" href={s.meetUrl} target="_blank" rel="noreferrer">
                            <Video size={14} /> Join
                          </a>
                        )}
                        <button className="btn sm" onClick={() => update(s, { status: "COMPLETED" }, "Marked as done.")} title="Mark as done">
                          <Check size={14} /> Done
                        </button>
                        <button
                          className="btn sm"
                          onClick={() => {
                            setNewTime(toLocalInput(new Date(s.startsAt)));
                            setRescheduling(s);
                          }}
                        >
                          <Clock size={14} /> Move
                        </button>
                        <button
                          className="icon-btn danger"
                          title="Cancel session"
                          aria-label="Cancel session"
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Cancel this session?",
                              body: `${s.client?.fullName ?? "The client"} will be notified that the session on ${dayLabel(s.startsAt).toLowerCase()} at ${time(s.startsAt)} is cancelled.`,
                              confirmLabel: "Cancel session",
                              danger: true,
                            });
                            if (ok) await update(s, { status: "CANCELLED" }, "Session cancelled. The client has been notified.");
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <Modal open={scheduling} onClose={() => setScheduling(false)} title="Schedule a session">
        {!clients.data ? (
          <Loading />
        ) : (
          <ScheduleForm
            key={presetClient ?? "any"}
            clients={ordered}
            onDone={() => {
              setScheduling(false);
              void sessions.reload();
            }}
          />
        )}
      </Modal>

      <Modal open={!!rescheduling} onClose={() => setRescheduling(null)} title="Move session" width={420}>
        <label className="field">
          New date and time
          <input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
        </label>
        <div className="muted small">The client gets a notification with the new time, and a fresh reminder the day before.</div>
        <div className="modal-actions">
          <button className="btn" onClick={() => setRescheduling(null)}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => rescheduling && update(rescheduling, { startsAt: new Date(newTime).toISOString() }, "Session moved. The client has been notified.")}>
            Save new time
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function SessionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SessionsContent />
    </Suspense>
  );
}
