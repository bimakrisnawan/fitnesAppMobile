"use client";

import { Archive, Copy, Pencil, Plus, Search, Send, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { BodyMap, MuscleBadges, type MuscleSelection } from "@/components/BodyMap";
import { Modal, useConfirm, useToast } from "@/components/feedback";
import { Avatar, Badge, ErrorBox, Loading, Progress, StatusBadge, Tabs } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { DAY_NAMES, describeLog, formatDate, prescription, TRACK } from "@/lib/format";
import type { CatalogExercise, Plan, PlanItem } from "@/lib/types";
import { useApi } from "@/lib/useApi";

type Kind = "reps" | "timed" | "distance";

type Draft = {
  exerciseId: string; // "" = custom
  name: string;
  day: number;
  kind: Kind;
  sets: string;
  reps: string;
  durationSeconds: string;
  distanceMeters: string;
  targetPace: string;
  notes: string;
  youtube: string;
  /** null = untouched: keep the catalog exercise's muscles. */
  muscles: MuscleSelection | null;
};

const n = (v: string) => (v.trim() === "" ? null : Number(v));
const str = (v: number | null) => (v === null ? "" : String(v));

function newDraft(day: number): Draft {
  return { exerciseId: "", name: "", day, kind: "reps", sets: "3", reps: "10", durationSeconds: "", distanceMeters: "", targetPace: "", notes: "", youtube: "", muscles: null };
}

function itemToDraft(i: PlanItem): Draft {
  return {
    exerciseId: "",
    name: i.name,
    day: i.dayOfWeek,
    kind: i.distanceMeters ? "distance" : i.durationSeconds && !i.reps ? "timed" : "reps",
    sets: str(i.sets),
    reps: str(i.reps),
    durationSeconds: str(i.durationSeconds),
    distanceMeters: str(i.distanceMeters),
    targetPace: i.targetPace ?? "",
    notes: i.notes ?? "",
    youtube: "",
    muscles: { primary: i.primaryMuscles, secondary: i.secondaryMuscles },
  };
}

/** Only the fields that match the chosen type are sent; the others are cleared. */
function toBody(d: Draft, week: number, editing: boolean) {
  return {
    ...(editing || !d.exerciseId ? { name: d.name.trim() } : { exerciseId: d.exerciseId }),
    weekNumber: week,
    dayOfWeek: d.day,
    sets: n(d.sets),
    reps: d.kind === "reps" ? n(d.reps) : null,
    durationSeconds: d.kind === "timed" ? n(d.durationSeconds) : null,
    distanceMeters: d.kind === "distance" ? n(d.distanceMeters) : null,
    targetPace: d.kind === "distance" ? d.targetPace.trim() || null : null,
    notes: d.notes.trim() || null,
    ...(d.youtube.trim() && { youtube: d.youtube.trim() }),
    ...(d.muscles && { primaryMuscles: d.muscles.primary, secondaryMuscles: d.muscles.secondary }),
  };
}

function ItemDialog({
  catalog,
  initial,
  editing,
  onSubmit,
  onClose,
}: {
  catalog: CatalogExercise[];
  initial: Draft;
  editing: boolean;
  onSubmit: (d: Draft) => Promise<void>;
  onClose: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [q, setQ] = useState("");
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch });
  const picked = catalog.find((c) => c.id === d.exerciseId);
  const muscles = d.muscles ?? { primary: picked?.primaryMuscles ?? [], secondary: picked?.secondaryMuscles ?? [] };
  const matches = catalog.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8);

  function pick(c: CatalogExercise) {
    // Runs and swims default to the distance type.
    const distance = /run|swim|kick|buoy|interval|drill/i.test(c.name);
    setD({ ...d, exerciseId: c.id, name: c.name, muscles: null, ...(distance && { kind: "distance" as const, sets: "1", reps: "" }) });
    setQ("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!d.exerciseId && !d.name.trim()) return setError("Pick an exercise or type a name");
    setBusy(true);
    setError(null);
    try {
      await onSubmit(d);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit} style={{ gap: 14 }}>
      {editing ? (
        <label className="field">
          Name
          <input value={d.name} onChange={(e) => set({ name: e.target.value })} required />
        </label>
      ) : (
        <div className="stack" style={{ gap: 6 }}>
          <span className="field">Exercise</span>
          {d.exerciseId || d.name ? (
            <div className="todo">
              <div style={{ flex: 1 }}>
                <strong>{d.name}</strong>
                {!d.exerciseId && <span className="muted small"> · custom</span>}
                <div>
                  <MuscleBadges primary={muscles.primary} />
                </div>
              </div>
              <button type="button" className="btn ghost sm" onClick={() => set({ exerciseId: "", name: "", muscles: null })}>
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="search">
                <Search size={16} />
                <input placeholder="Search the exercise library…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              </div>
              <div className="stack" style={{ gap: 4, maxHeight: 240, overflow: "auto" }}>
                {matches.map((c) => (
                  <button type="button" key={c.id} className="demo-btn" onClick={() => pick(c)}>
                    <div style={{ flex: 1 }}>
                      <div className="strong">
                        {c.name} {c.youtubeVideoId && <Video size={13} style={{ verticalAlign: "middle", color: "var(--info)" }} />}
                      </div>
                      <MuscleBadges primary={c.primaryMuscles} />
                    </div>
                  </button>
                ))}
                {q.trim() && (
                  <button type="button" className="demo-btn" onClick={() => set({ name: q.trim(), exerciseId: "" })}>
                    <Plus size={16} /> Use “{q.trim()}” as a custom exercise
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="form-grid">
        <label className="field">
          Day
          <select value={d.day} onChange={(e) => set({ day: Number(e.target.value) })}>
            {DAY_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          Type
          <Tabs<Kind>
            value={d.kind}
            onChange={(kind) => set({ kind })}
            options={[
              { value: "reps", label: "Reps" },
              { value: "timed", label: "Timed" },
              { value: "distance", label: "Distance" },
            ]}
          />
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          {d.kind === "distance" ? "Repeats" : "Sets"}
          <input inputMode="numeric" value={d.sets} onChange={(e) => set({ sets: e.target.value })} placeholder="3" />
        </label>
        {d.kind === "reps" && (
          <label className="field">
            Reps
            <input inputMode="numeric" value={d.reps} onChange={(e) => set({ reps: e.target.value })} placeholder="10" />
          </label>
        )}
        {d.kind === "timed" && (
          <label className="field">
            Seconds
            <input inputMode="numeric" value={d.durationSeconds} onChange={(e) => set({ durationSeconds: e.target.value })} placeholder="30" />
          </label>
        )}
        {d.kind === "distance" && (
          <>
            <label className="field">
              Metres{Number(d.sets) > 1 ? " (each)" : ""}
              <input inputMode="numeric" value={d.distanceMeters} onChange={(e) => set({ distanceMeters: e.target.value })} placeholder="5000" />
            </label>
            <label className="field">
              Target pace
              <input value={d.targetPace} onChange={(e) => set({ targetPace: e.target.value })} placeholder="6:30/km or 1:55/100m" />
            </label>
          </>
        )}
      </div>

      <label className="field">
        Note for the client
        <input value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. Keep it conversational · Each leg · Last set to failure" />
      </label>

      <button type="button" className="btn ghost sm" style={{ justifySelf: "start" }} onClick={() => setMore(!more)}>
        {more ? "Hide" : "Show"} muscles & video
      </button>
      {more && (
        <div className="stack">
          <label className="field">
            YouTube link (optional, replaces the library video for this item)
            <input value={d.youtube} onChange={(e) => set({ youtube: e.target.value })} placeholder="https://youtu.be/…" />
          </label>
          <BodyMap value={muscles} onChange={(m) => set({ muscles: m })} height={200} />
        </div>
      )}

      {error && <div className="alert">{error}</div>}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Add to plan"}
        </button>
      </div>
    </form>
  );
}

export default function PlanBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const planReq = useApi<{ plan: Plan }>(`/coach/plans/${id}`);
  const catalogReq = useApi<{ exercises: CatalogExercise[] }>("/coach/exercises");
  const [week, setWeek] = useState(1);
  const [weeks, setWeeks] = useState(1);
  const [opened, setOpened] = useState(false);
  const [dialog, setDialog] = useState<{ draft: Draft; item?: PlanItem } | null>(null);
  const [modal, setModal] = useState<"details" | "copy" | null>(null);
  const [copyTo, setCopyTo] = useState(2);
  const [busy, setBusy] = useState(false);

  const plan = planReq.data?.plan;
  useEffect(() => {
    if (!plan) return;
    // Keep week tabs in sync with the plan, and open on the current week the first time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeeks((w) => Math.max(w, plan.totalWeeks));
    if (!opened) {
      setWeek(Math.min(Math.max(plan.currentWeek, 1), plan.totalWeeks));
      setOpened(true);
    }
  }, [plan, opened]);

  if (planReq.loading || catalogReq.loading) return <Loading />;
  if (planReq.error || !plan) return <ErrorBox message={planReq.error ?? "Plan not found"} />;
  const catalog = catalogReq.data?.exercises ?? [];
  const items = plan.exercises.filter((e) => e.weekNumber === week);
  const weekDone = items.filter((e) => e.completed).length;
  const start = new Date(plan.startDate);
  const dateOf = (day: number) => new Date(start.getTime() + ((week - 1) * 7 + day - 1) * 86_400_000);
  const today = new Date().toDateString();

  async function act(fn: () => Promise<unknown>, success?: string) {
    setBusy(true);
    try {
      await fn();
      if (success) toast(success);
      await planReq.reload();
      return true;
    } catch (err) {
      toast(errorText(err), "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveDetails(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ok = await act(
      () =>
        api(`/coach/plans/${plan!.id}`, {
          method: "PUT",
          body: { title: String(f.get("title")).trim(), description: String(f.get("description")).trim() || null, startDate: String(f.get("startDate")) },
        }),
      "Plan details saved.",
    );
    if (ok) setModal(null);
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <Link className="crumb" href="/plans">
        ← Training plans
      </Link>

      <div className="card stack" style={{ gap: 14 }}>
        <div className="spread" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
          <div className="stack" style={{ gap: 4 }}>
            <div className="row" style={{ gap: 10 }}>
              <h1>{plan.title}</h1>
              <StatusBadge status={plan.status} />
            </div>
            <Link href={`/clients/${plan.client.id}`} className="row muted" style={{ gap: 8 }}>
              <Avatar name={plan.client.fullName} size={24} />
              <span>
                for <strong style={{ color: "var(--text)" }}>{plan.client.fullName}</strong> · {TRACK[plan.specialization]} · week 1 starts {formatDate(plan.startDate)}
              </span>
            </Link>
          </div>
          <div className="row">
            <button className="btn" onClick={() => setModal("details")}>
              <Pencil size={15} /> Details
            </button>
            {plan.status !== "ACTIVE" && (
              <button
                className="btn primary"
                disabled={busy}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Publish to ${plan.client.fullName}?`,
                    body: "They'll get a notification and see this plan in the app. Any other active plan of theirs is archived.",
                    confirmLabel: "Publish",
                  });
                  if (ok) await act(() => api(`/coach/plans/${plan.id}/publish`, { method: "POST" }), "Published! The client has been notified.");
                }}
              >
                <Send size={15} /> Publish to client
              </button>
            )}
            <button
              className="btn danger"
              disabled={busy}
              onClick={async () => {
                const draft = plan.status === "DRAFT";
                const ok = await confirm({
                  title: draft ? "Delete this draft?" : "Archive this plan?",
                  body: draft ? "This can't be undone." : "The client will no longer see it. Their training log is kept.",
                  confirmLabel: draft ? "Delete draft" : "Archive",
                  danger: true,
                });
                if (ok && (await act(() => api(`/coach/plans/${plan.id}`, { method: "DELETE" }), draft ? "Draft deleted." : "Plan archived."))) router.push("/plans");
              }}
            >
              {plan.status === "DRAFT" ? <Trash2 size={15} /> : <Archive size={15} />}
              {plan.status === "DRAFT" ? "Delete" : "Archive"}
            </button>
          </div>
        </div>
        {plan.status === "DRAFT" && <div className="alert info">Draft: {plan.client.fullName.split(" ")[0]} can&apos;t see this plan until you publish it.</div>}
        {plan.description && <div className="muted">{plan.description}</div>}
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div className="spread small">
              <span className="muted">Week {week}</span>
              <strong>
                {weekDone}/{items.length} done
              </strong>
            </div>
            <Progress value={items.length ? weekDone / items.length : 0} tone="primary" />
          </div>
          <div className="stack" style={{ gap: 4 }}>
            <div className="spread small">
              <span className="muted">Whole plan</span>
              <strong>
                {plan.progress.completed}/{plan.progress.total} done
              </strong>
            </div>
            <Progress value={plan.progress.total ? plan.progress.completed / plan.progress.total : 0} />
          </div>
        </div>
      </div>

      <div className="spread" style={{ flexWrap: "wrap" }}>
        <div className="row">
          <Tabs
            value={String(week)}
            onChange={(v) => setWeek(Number(v))}
            options={Array.from({ length: weeks }, (_, i) => ({
              value: String(i + 1),
              label: plan.status === "ACTIVE" && i + 1 === plan.currentWeek ? `Week ${i + 1} • now` : `Week ${i + 1}`,
            }))}
          />
          <button
            className="btn sm"
            onClick={() => {
              setWeeks(weeks + 1);
              setWeek(weeks + 1);
            }}
          >
            <Plus size={14} /> Week
          </button>
        </div>
        <button
          className="btn sm"
          disabled={!items.length}
          onClick={() => {
            setCopyTo(week < weeks ? week + 1 : weeks + 1);
            setModal("copy");
          }}
        >
          <Copy size={14} /> Copy week {week}…
        </button>
      </div>

      <div className="week-board">
        {DAY_NAMES.map((name, i) => {
          const day = i + 1;
          const dayItems = items.filter((e) => e.dayOfWeek === day);
          const isToday = dateOf(day).toDateString() === today;
          return (
            <div key={name} className={`day-row ${isToday ? "today" : ""}`}>
              <div className="day-label">
                <strong>{name}</strong>
                <span className="muted small">{dateOf(day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                {isToday && <Badge tone="primary">Today</Badge>}
                {!dayItems.length && <span className="muted small">Rest day</span>}
              </div>
              <div className="day-items">
                {dayItems.map((item) => (
                  <div key={item.id} className={`item ${item.completed ? "done" : ""}`}>
                    <span className="item-name">
                      {item.name} {item.youtubeVideoId && <Video size={13} style={{ verticalAlign: "middle", color: "var(--info)" }} />}
                    </span>
                    <span className="small">{prescription(item) || "—"}</span>
                    <MuscleBadges primary={item.primaryMuscles} />
                    {item.notes && <span className="small muted">{item.notes}</span>}
                    {item.lastLog && (
                      <span className="small" style={{ color: "var(--success)" }}>
                        ✓ {describeLog(item.lastLog)}
                      </span>
                    )}
                    <div className="item-actions">
                      <button className="icon-btn" title="Edit" aria-label={`Edit ${item.name}`} onClick={() => setDialog({ draft: itemToDraft(item), item })}>
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Remove"
                        aria-label={`Remove ${item.name}`}
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Remove ${item.name}?`,
                            body: item.logCount ? "The client already logged this; their log for it will be removed too." : undefined,
                            confirmLabel: "Remove",
                            danger: true,
                          });
                          if (ok) await act(() => api(`/coach/plans/${plan.id}/exercises/${item.id}`, { method: "DELETE" }), "Removed.");
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                <button className="add-tile" onClick={() => setDialog({ draft: newDraft(day) })}>
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!dialog} onClose={() => setDialog(null)} title={dialog?.item ? `Edit ${dialog.item.name}` : `Add to week ${week}`} width={600}>
        {dialog && (
          <ItemDialog
            key={dialog.item?.id ?? `new-${dialog.draft.day}`}
            catalog={catalog}
            initial={dialog.draft}
            editing={!!dialog.item}
            onClose={() => setDialog(null)}
            onSubmit={async (d) => {
              const body = toBody(d, week, !!dialog.item);
              if (dialog.item) await api(`/coach/plans/${plan.id}/exercises/${dialog.item.id}`, { method: "PUT", body });
              else await api(`/coach/plans/${plan.id}/exercises`, { method: "POST", body });
              toast(dialog.item ? "Saved." : `Added to ${DAY_NAMES[d.day - 1]}.`);
              setDialog(null);
              await planReq.reload();
            }}
          />
        )}
      </Modal>

      <Modal open={modal === "copy"} onClose={() => setModal(null)} title={`Copy week ${week}`} width={420}>
        <label className="field">
          Copy all {items.length} items to
          <select value={copyTo} onChange={(e) => setCopyTo(Number(e.target.value))}>
            {Array.from({ length: weeks + 1 }, (_, i) => i + 1)
              .filter((w) => w !== week)
              .map((w) => (
                <option key={w} value={w}>
                  Week {w}
                  {plan.exercises.some((e) => e.weekNumber === w) ? " (will be replaced)" : w > weeks ? " (new)" : ""}
                </option>
              ))}
          </select>
        </label>
        <div className="muted small">Handy for multi-week blocks: copy, then tweak distances or reps for progression.</div>
        <div className="modal-actions">
          <button className="btn" onClick={() => setModal(null)}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={busy}
            onClick={async () => {
              if (await act(() => api(`/coach/plans/${plan.id}/copy-week`, { method: "POST", body: { from: week, to: copyTo } }), `Week ${week} copied to week ${copyTo}.`)) {
                setModal(null);
                setWeeks(Math.max(weeks, copyTo));
                setWeek(copyTo);
              }
            }}
          >
            Copy
          </button>
        </div>
      </Modal>

      <Modal open={modal === "details"} onClose={() => setModal(null)} title="Plan details">
        <form className="stack" onSubmit={saveDetails}>
          <label className="field">
            Title
            <input name="title" defaultValue={plan.title} required />
          </label>
          <label className="field">
            Week 1 starts
            <input name="startDate" type="date" defaultValue={plan.startDate.slice(0, 10)} required />
          </label>
          <label className="field">
            Note for the client
            <textarea name="description" defaultValue={plan.description ?? ""} />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy}>
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
