"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { BodyMap } from "@/components/BodyMap";
import { useConfirm, useToast } from "@/components/feedback";
import { Badge, ErrorBox, Loading } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { CATEGORY, EQUIPMENT_SETTING, LEVEL, TRACK, youtubeThumb } from "@/lib/format";
import type { CatalogExercise, LibraryWorkoutDetail } from "@/lib/types";
import { useApi } from "@/lib/useApi";

type Row = { key: string; exerciseId: string; sets: string; reps: string; durationSeconds: string; restSeconds: string; notes: string };

const s = (v: number | null) => (v === null ? "" : String(v));
const n = (v: string) => (v.trim() === "" ? null : Number(v));
let rowKey = 0;
const toRows = (w: LibraryWorkoutDetail): Row[] =>
  w.exercises.map((e) => ({
    key: `r${rowKey++}`,
    exerciseId: e.exercise.id,
    sets: s(e.sets),
    reps: s(e.reps),
    durationSeconds: s(e.durationSeconds),
    restSeconds: s(e.restSeconds),
    notes: e.notes ?? "",
  }));

function Details({ workout, onSaved }: { workout: LibraryWorkoutDetail; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim();
    const thumb = str("thumbnail");
    setBusy(true);
    setError(null);
    try {
      await api(`/coach/workouts/${workout.id}`, {
        method: "PUT",
        body: {
          title: str("title"),
          description: str("description") || null,
          category: str("category"),
          specialization: str("specialization") || null,
          difficulty: str("difficulty"),
          durationMinutes: Number(str("durationMinutes")),
          equipmentSetting: str("equipmentSetting"),
          equipment: str("equipment").split(",").map((x) => x.trim()).filter(Boolean),
          youtube: str("youtube") || null,
          // A bare file name means a file in backend/public/media.
          thumbnailUrl: !thumb ? null : thumb.startsWith("http") || thumb.startsWith("/media/") ? thumb : `/media/${thumb}`,
        },
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={save} onChange={() => setSaved(false)}>
      <h2>Details</h2>
      <div className="form-grid">
        <label className="field" style={{ gridColumn: "span 2" }}>
          Title
          <input name="title" defaultValue={workout.title} required />
        </label>
        <label className="field">
          Type
          <select name="category" defaultValue={workout.category}>
            {Object.entries(CATEGORY).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Sport (optional)
          <select name="specialization" defaultValue={workout.specialization ?? ""}>
            <option value="">—</option>
            {Object.entries(TRACK).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Level
          <select name="difficulty" defaultValue={workout.difficulty}>
            {Object.entries(LEVEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Where
          <select name="equipmentSetting" defaultValue={workout.equipmentSetting}>
            {Object.entries(EQUIPMENT_SETTING).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Minutes
          <input name="durationMinutes" type="number" min={1} max={300} defaultValue={workout.durationMinutes} required />
        </label>
        <label className="field">
          Equipment (comma-separated)
          <input name="equipment" defaultValue={workout.equipment.join(", ")} placeholder="dumbbell, mat" />
        </label>
      </div>
      <label className="field">
        Description for members
        <textarea name="description" defaultValue={workout.description ?? ""} placeholder="What it trains and who it's for" />
      </label>
      <div className="form-grid">
        <label className="field">
          Follow-along video (YouTube, optional)
          <input name="youtube" defaultValue={workout.youtubeVideoId ? `https://youtu.be/${workout.youtubeVideoId}` : ""} placeholder="https://youtu.be/…" />
        </label>
        <label className="field">
          Cover image (file in backend/public/media, or https URL)
          <input name="thumbnail" defaultValue={workout.thumbnailUrl?.replace(/^\/media\//, "") ?? ""} placeholder="full-body-basics.jpg" />
        </label>
      </div>
      <div className="row">
        {workout.youtubeVideoId && (
          // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail
          <img className="thumb" src={youtubeThumb(workout.youtubeVideoId)} alt="Video" />
        )}
        {workout.thumbnailPreview && (
          // eslint-disable-next-line @next/next/no-img-element -- local media preview
          <img className="thumb" src={workout.thumbnailPreview} alt="Cover" />
        )}
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="row">
        <button className="btn primary" disabled={busy}>
          {busy ? "Saving…" : "Save details"}
        </button>
        {saved && <span className="small" style={{ color: "var(--success)" }}>Saved ✓</span>}
      </div>
    </form>
  );
}

export default function WorkoutEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const workoutReq = useApi<{ workout: LibraryWorkoutDetail }>(`/coach/workouts/${id}`);
  const catalogReq = useApi<{ exercises: CatalogExercise[] }>("/coach/exercises");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const workout = workoutReq.data?.workout;
  useEffect(() => {
    // Load the editable list once the workout arrives (and after saves, when nothing is pending).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (workout && !dirty) setRows(toRows(workout));
  }, [workout, dirty]);

  if (workoutReq.loading || catalogReq.loading || !rows) return workoutReq.error ? <ErrorBox message={workoutReq.error} /> : <Loading />;
  if (!workout) return <ErrorBox message="Workout not found" />;
  const catalog = catalogReq.data?.exercises ?? [];
  const byId = new Map(catalog.map((c) => [c.id, c]));

  const change = (next: Row[]) => {
    setRows(next);
    setDirty(true);
  };
  const patch = (key: string, p: Partial<Row>) => change(rows.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...rows];
    const [r] = next.splice(i, 1);
    next.splice(i + d, 0, r!);
    change(next);
  };

  // Live muscle map from the (possibly unsaved) list.
  const chosen = rows.map((r) => byId.get(r.exerciseId)).filter((c): c is CatalogExercise => !!c);
  const primary = [...new Set(chosen.flatMap((c) => c.primaryMuscles))];
  const secondary = [...new Set(chosen.flatMap((c) => c.secondaryMuscles))].filter((m) => !primary.includes(m));

  async function act(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await fn();
      toast(success);
      await workoutReq.reload();
      return true;
    } catch (err) {
      toast(errorText(err), "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveExercises() {
    await act(async () => {
      await api(`/coach/workouts/${workout!.id}/exercises`, {
        method: "PUT",
        body: {
          items: rows!.map((r) => ({
            exerciseId: r.exerciseId,
            sets: n(r.sets),
            reps: n(r.reps),
            durationSeconds: n(r.durationSeconds),
            restSeconds: n(r.restSeconds),
            notes: r.notes.trim() || null,
          })),
        },
      });
      setDirty(false);
    }, "Exercises saved.");
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <Link className="link small" href="/workouts">
            ← Workout library
          </Link>
          <div className="row">
            <h1>{workout.title}</h1>
            {workout.isPublished ? <Badge tone="success">Published</Badge> : <Badge tone="warn">Draft</Badge>}
          </div>
          <div className="muted small">Done {workout.completions}× by members</div>
        </div>
        <div className="row">
          <button
            className={`btn ${workout.isPublished ? "" : "primary"}`}
            disabled={busy || dirty}
            title={dirty ? "Save the exercise list first" : undefined}
            onClick={() =>
              act(
                () => api(`/coach/workouts/${workout.id}`, { method: "PUT", body: { isPublished: !workout.isPublished } }),
                workout.isPublished ? "Unpublished: members no longer see it." : "Published: members can now see this workout.",
              )
            }
          >
            {workout.isPublished ? "Unpublish" : "Publish to members"}
          </button>
          <button
            className="btn danger"
            disabled={busy}
            onClick={async () => {
              const ok = await confirm({
                title: workout.completions ? "Unpublish this workout?" : "Delete this workout?",
                body: workout.completions ? `Members have done it ${workout.completions}×, so it will be unpublished instead of deleted. Their history is kept.` : "This can't be undone.",
                confirmLabel: workout.completions ? "Unpublish" : "Delete",
                danger: true,
              });
              if (ok && (await act(() => api(`/coach/workouts/${workout.id}`, { method: "DELETE" }), workout.completions ? "Unpublished." : "Workout deleted."))) router.push("/workouts");
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {!workout.isPublished && <div className="alert info">Draft: members can&apos;t see this workout until you publish it.</div>}

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) 300px", alignItems: "start" }}>
        <div className="stack" style={{ gap: 16 }}>
          <div className="card stack">
            <div className="spread">
              <h2>Exercises ({rows.length})</h2>
              {dirty && <Badge tone="warn">Unsaved changes</Badge>}
            </div>
            {!rows.length && <div className="empty">No exercises yet. Add the first one below.</div>}
            {rows.length > 0 && (
              <div className="form-grid muted small" style={{ gridTemplateColumns: "repeat(4, minmax(70px, 1fr)) 2fr", padding: "0 8px", fontWeight: 600 }}>
                <span>Sets</span>
                <span>Reps</span>
                <span>Seconds (timed)</span>
                <span>Rest (seconds)</span>
                <span>Note for members</span>
              </div>
            )}
            {rows.map((r, i) => {
              const ex = byId.get(r.exerciseId);
              return (
                <div key={r.key} className="item" style={{ gap: 8 }}>
                  <div className="spread">
                    <strong>
                      {i + 1}. {ex?.name ?? "Unknown exercise"} {ex?.youtubeVideoId && <Badge tone="info">▶</Badge>}
                    </strong>
                    <div className="row">
                      <button type="button" className="btn ghost sm" disabled={i === 0} onClick={() => move(i, -1)} title="Move up">
                        ↑
                      </button>
                      <button type="button" className="btn ghost sm" disabled={i === rows.length - 1} onClick={() => move(i, 1)} title="Move down">
                        ↓
                      </button>
                      <button type="button" className="btn ghost sm danger" onClick={() => change(rows.filter((x) => x.key !== r.key))}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="form-grid" style={{ gridTemplateColumns: "repeat(4, minmax(70px, 1fr)) 2fr" }}>
                    <input placeholder="Sets" inputMode="numeric" value={r.sets} onChange={(e) => patch(r.key, { sets: e.target.value })} />
                    <input placeholder="Reps" inputMode="numeric" value={r.reps} onChange={(e) => patch(r.key, { reps: e.target.value })} />
                    <input placeholder="Seconds" inputMode="numeric" value={r.durationSeconds} onChange={(e) => patch(r.key, { durationSeconds: e.target.value })} />
                    <input placeholder="Rest (s)" inputMode="numeric" value={r.restSeconds} onChange={(e) => patch(r.key, { restSeconds: e.target.value })} />
                    <input placeholder="Note, e.g. each leg" value={r.notes} onChange={(e) => patch(r.key, { notes: e.target.value })} />
                  </div>
                </div>
              );
            })}
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <select value={adding} onChange={(e) => setAdding(e.target.value)}>
                <option value="">Add an exercise from the Exercise library…</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn"
                disabled={!adding}
                onClick={() => {
                  change([...rows, { key: `r${rowKey++}`, exerciseId: adding, sets: "3", reps: "10", durationSeconds: "", restSeconds: "60", notes: "" }]);
                  setAdding("");
                }}
              >
                + Add
              </button>
            </div>
            <div className="row">
              <button className="btn primary" disabled={busy || !dirty} onClick={saveExercises}>
                Save exercises
              </button>
              {dirty && (
                <button
                  className="btn ghost"
                  onClick={() => {
                    setRows(toRows(workout));
                    setDirty(false);
                  }}
                >
                  Discard changes
                </button>
              )}
            </div>
          </div>
          <Details key={`${workout.id}:${workout.title}:${workout.youtubeVideoId}:${workout.thumbnailUrl}`} workout={workout} onSaved={() => void workoutReq.reload()} />
        </div>

        <div className="card stack" style={{ position: "sticky", top: 16 }}>
          <h2>Muscles worked</h2>
          <span className="muted small">Combined from the exercises above. Members see this map on the workout page. Tag muscles per exercise in the Exercise library.</span>
          <BodyMap value={{ primary, secondary }} height={220} />
        </div>
      </div>
    </div>
  );
}
