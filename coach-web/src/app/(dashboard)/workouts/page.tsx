"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Dumbbell, Plus } from "lucide-react";
import { Modal } from "@/components/feedback";
import { Badge, EmptyState, ErrorBox, Loading, PageHeader, Tabs } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { CATEGORY, CATEGORY_GRADIENT, EQUIPMENT_SETTING, LEVEL } from "@/lib/format";
import type { LibraryWorkout } from "@/lib/types";
import { useApi } from "@/lib/useApi";

function NewWorkout({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("STRENGTH");
  const [difficulty, setDifficulty] = useState("BEGINNER");
  const [equipmentSetting, setEquipmentSetting] = useState("HOME");
  const [durationMinutes, setDuration] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { workout } = await api<{ workout: { id: string } }>("/coach/workouts", {
        method: "POST",
        body: { title: title.trim(), category, difficulty, equipmentSetting, durationMinutes },
      });
      router.push(`/workouts/${workout.id}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="form-grid">
        <label className="field" style={{ gridColumn: "span 2" }}>
          Title
          <input placeholder="e.g. 15-Minute Core Burner" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="field">
          Type
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(CATEGORY).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Level
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {Object.entries(LEVEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Where
          <select value={equipmentSetting} onChange={(e) => setEquipmentSetting(e.target.value)}>
            {Object.entries(EQUIPMENT_SETTING).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Minutes
          <input type="number" min={1} max={300} value={durationMinutes} onChange={(e) => setDuration(Number(e.target.value))} />
        </label>
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn primary" disabled={busy || !title.trim()}>
          {busy ? "Creating…" : "Create & add exercises"}
        </button>
      </div>
    </form>
  );
}

export default function WorkoutsPage() {
  const router = useRouter();
  const { data, error, loading } = useApi<{ workouts: LibraryWorkout[] }>("/coach/workouts");
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const list = (data?.workouts ?? []).filter((w) => (filter === "all" ? true : filter === "published" ? w.isPublished : !w.isPublished));
  const published = data?.workouts.filter((w) => w.isPublished).length ?? 0;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <PageHeader
        title="Workout library"
        subtitle={`Ready-made groups of exercises for Monthly members (1-on-1 clients get them too).${data ? ` ${published} published · ${data.workouts.length - published} draft.` : ""}`}
        actions={
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> New workout
          </button>
        }
      />

      <Modal open={creating} onClose={() => setCreating(false)} title="New library workout">
        <NewWorkout onCancel={() => setCreating(false)} />
      </Modal>

      <Tabs
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "published", label: "Published" },
          { value: "draft", label: "Drafts" },
        ]}
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : !list.length ? (
        <div className="card">
          <EmptyState icon={Dumbbell} title="No workouts here" body="Create a workout, add exercises from the Exercise library, then publish it to members." />
        </div>
      ) : (
        <div className="cards">
          {list.map((w) => (
            <div key={w.id} className="wcard" onClick={() => router.push(`/workouts/${w.id}`)}>
              <div
                className="wcard-banner"
                style={{
                  backgroundImage: w.thumbnailPreview
                    ? `linear-gradient(transparent, rgba(0,0,0,.55)), url(${w.thumbnailPreview})`
                    : `linear-gradient(135deg, ${CATEGORY_GRADIENT[w.category][0]}, ${CATEGORY_GRADIENT[w.category][1]})`,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", opacity: 0.9 }}>{CATEGORY[w.category].toUpperCase()}</span>
                <strong style={{ fontSize: 16 }}>{w.title}</strong>
              </div>
              <div className="wcard-body">
                <div className="row">
                  {w.isPublished ? <Badge tone="success">Published</Badge> : <Badge tone="warn">Draft</Badge>}
                  {w.youtubeVideoId && <Badge tone="info">▶ Video</Badge>}
                </div>
                <span className="small muted">
                  {w.durationMinutes} min · {LEVEL[w.difficulty]} · {EQUIPMENT_SETTING[w.equipmentSetting]} · {w.exerciseCount} exercises
                </span>
                <span className="small muted">Done {w.completions}× by members</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
