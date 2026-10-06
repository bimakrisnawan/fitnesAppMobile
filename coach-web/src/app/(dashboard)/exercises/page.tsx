"use client";

import { type FormEvent, useState } from "react";
import { BodyMap, MuscleBadges, type MuscleSelection } from "@/components/BodyMap";
import { Plus } from "lucide-react";
import { useToast } from "@/components/feedback";
import { ErrorBox, Loading, PageHeader } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { youtubeThumb } from "@/lib/format";
import type { Alternative, CatalogExercise } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const SETTINGS: Alternative["setting"][] = ["home", "minimal", "outdoor", "gym"];

/** Client-side copy of the API's YouTube parsing, for the live preview. */
function youtubeId(input: string): string | null {
  const v = input.trim();
  if (/^[\w-]{11}$/.test(v)) return v;
  try {
    const url = new URL(v);
    const id = url.hostname.endsWith("youtu.be") ? url.pathname.split("/")[1] : (url.searchParams.get("v") ?? url.pathname.match(/\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1]);
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

type Draft = {
  name: string;
  description: string;
  youtube: string;
  equipment: string;
  alternatives: Alternative[];
  muscles: MuscleSelection;
};

const toDraft = (e: CatalogExercise | null): Draft => ({
  name: e?.name ?? "",
  description: e?.description ?? "",
  youtube: e?.youtubeVideoId ? `https://youtu.be/${e.youtubeVideoId}` : "",
  equipment: e?.equipment.join(", ") ?? "",
  alternatives: e?.alternatives ?? [],
  muscles: { primary: e?.primaryMuscles ?? [], secondary: e?.secondaryMuscles ?? [] },
});

function Editor({ exercise, onSaved, onCancel }: { exercise: CatalogExercise | null; onSaved: (id: string) => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(() => toDraft(exercise));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const preview = d.youtube.trim() ? youtubeId(d.youtube) : null;
  const update = (patch: Partial<Draft>) => {
    setD({ ...d, ...patch });
    setSaved(false);
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: d.name.trim(),
        description: d.description.trim() || null,
        youtube: d.youtube.trim() || null,
        equipment: d.equipment.split(",").map((s) => s.trim()).filter(Boolean),
        alternatives: d.alternatives.filter((a) => a.replace.trim() && a.with.trim()),
        primaryMuscles: d.muscles.primary,
        secondaryMuscles: d.muscles.secondary,
      };
      const res = exercise
        ? await api<{ exercise: CatalogExercise }>(`/coach/exercises/${exercise.id}`, { method: "PUT", body })
        : await api<{ exercise: CatalogExercise }>("/coach/exercises", { method: "POST", body });
      setSaved(true);
      toast(exercise ? `${res.exercise.name} saved.` : `${res.exercise.name} added to the library.`);
      onSaved(res.exercise.id);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={save} style={{ gap: 14 }}>
      <div className="spread">
        <h2>{exercise ? exercise.name : "New exercise"}</h2>
        <button type="button" className="btn ghost sm" onClick={onCancel}>
          Close
        </button>
      </div>

      <div className="form-grid">
        <label className="field" style={{ gridColumn: "span 2" }}>
          Name
          <input value={d.name} onChange={(e) => update({ name: e.target.value })} required />
        </label>
        <label className="field">
          Equipment (comma-separated)
          <input value={d.equipment} onChange={(e) => update({ equipment: e.target.value })} placeholder="dumbbell, bench" />
        </label>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <label className="field">
          1. Demo video (YouTube link)
          <input value={d.youtube} onChange={(e) => update({ youtube: e.target.value })} placeholder="https://youtu.be/… or https://www.youtube.com/watch?v=…" />
        </label>
        {d.youtube.trim() && !preview && <span className="small" style={{ color: "var(--danger)" }}>That doesn&apos;t look like a YouTube link.</span>}
        {preview && (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${preview}`}
            title="Video preview"
            style={{ width: "100%", maxWidth: 480, aspectRatio: "16 / 9", border: 0, borderRadius: 10 }}
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <span className="field">2. Muscles this exercise trains</span>
        <div className="card" style={{ background: "var(--surface-2)", boxShadow: "none" }}>
          <BodyMap value={d.muscles} onChange={(muscles) => update({ muscles })} height={280} />
        </div>
      </div>

      <label className="field">
        3. Coaching cues
        <textarea value={d.description} onChange={(e) => update({ description: e.target.value })} placeholder="How to do it well: setup, movement, common mistakes" />
      </label>

      <div className="stack" style={{ gap: 6 }}>
        <span className="field">4. Equipment alternatives (for clients without a gym)</span>
        {d.alternatives.map((a, i) => (
          <div className="row" key={i} style={{ flexWrap: "nowrap" }}>
            <select value={a.setting} style={{ width: 120 }} onChange={(e) => update({ alternatives: d.alternatives.map((x, j) => (j === i ? { ...x, setting: e.target.value as Alternative["setting"] } : x)) })}>
              {SETTINGS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input placeholder="Instead of… (dumbbell)" value={a.replace} onChange={(e) => update({ alternatives: d.alternatives.map((x, j) => (j === i ? { ...x, replace: e.target.value } : x)) })} />
            <input placeholder="Use… (water bottle)" value={a.with} onChange={(e) => update({ alternatives: d.alternatives.map((x, j) => (j === i ? { ...x, with: e.target.value } : x)) })} />
            <button type="button" className="btn ghost sm" onClick={() => update({ alternatives: d.alternatives.filter((_, j) => j !== i) })}>
              ✕
            </button>
          </div>
        ))}
        <div>
          <button type="button" className="btn sm" onClick={() => update({ alternatives: [...d.alternatives, { setting: "home", replace: "", with: "" }] })}>
            + Alternative
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      <div className="row">
        <button className="btn primary" disabled={busy}>
          {busy ? "Saving…" : exercise ? "Save changes" : "Add to library"}
        </button>
        {saved && <span className="small" style={{ color: "var(--success)" }}>Saved ✓ Clients see it straight away.</span>}
      </div>
    </form>
  );
}

export default function ExercisesPage() {
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useApi<{ exercises: CatalogExercise[] }>("/coach/exercises");
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const all = data?.exercises ?? [];
  const list = all.filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()));
  const withVideo = all.filter((e) => e.youtubeVideoId).length;
  const withMuscles = all.filter((e) => e.primaryMuscles.length).length;
  const current = selected && selected !== "new" ? (all.find((e) => e.id === selected) ?? null) : null;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <PageHeader
        title="Exercise library"
        subtitle={`${data ? `${withVideo}/${all.length} have a video · ${withMuscles}/${all.length} have muscles tagged. ` : ""}Single exercises with their video, muscles and home alternatives. Used by library workouts and training plans.`}
        actions={
          <button className="btn primary" onClick={() => setSelected("new")}>
            <Plus size={16} /> New exercise
          </button>
        }
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: selected ? "minmax(260px, 340px) 1fr" : "1fr", alignItems: "start" }}>
          <div className="card stack" style={{ gap: 0, padding: 8 }}>
            <input placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 6 }} />
            {list.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e.id)}
                className="list-item"
                style={{
                  background: selected === e.id ? "var(--primary-soft)" : "transparent",
                  border: 0,
                  borderBottom: "1px solid var(--border)",
                  textAlign: "left",
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 8,
                  color: "inherit",
                  font: "inherit",
                  alignItems: "center",
                }}
              >
                {e.youtubeVideoId ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail
                  <img className="thumb" style={{ width: 64 }} src={youtubeThumb(e.youtubeVideoId)} alt="" />
                ) : (
                  <div className="thumb" style={{ width: 64, display: "grid", placeItems: "center" }}>
                    <span className="muted small">▶ –</span>
                  </div>
                )}
                <div style={{ flex: 1, display: "grid" }}>
                  <strong>{e.name}</strong>
                  {e.primaryMuscles.length ? <MuscleBadges primary={e.primaryMuscles} /> : <span className="small muted">No muscles tagged</span>}
                </div>
              </button>
            ))}
            {!list.length && <div className="empty">No exercises match.</div>}
          </div>
          {selected && (
            <Editor
              // Re-mount once a just-created exercise shows up in the reloaded list.
              key={selected === "new" ? "new" : `${selected}:${current ? "loaded" : "pending"}`}
              exercise={current}
              onCancel={() => setSelected(null)}
              onSaved={(id) => {
                void reload();
                setSelected(id);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
