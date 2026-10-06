"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { api, errorText } from "@/lib/api";
import { TRACK } from "@/lib/format";

export interface PlanClientOption {
  id: string;
  fullName: string;
  specialization: string | null;
  goals: string | null;
}

/** Creates a draft plan and opens the plan builder. Used on the Plans page and the client page. */
export function NewPlanForm({ clients, initialClientId, onCancel }: { clients: PlanClientOption[]; initialClientId?: string; onCancel: () => void }) {
  const router = useRouter();
  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));
  const [clientId, setClientId] = useState(initialClientId ?? clients[0]?.id ?? "");
  const client = clients.find((c) => c.id === clientId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [track, setTrack] = useState(client?.specialization ?? "GENERAL");
  const [startDate, setStartDate] = useState(`${nextMonday.getFullYear()}-${String(nextMonday.getMonth() + 1).padStart(2, "0")}-${String(nextMonday.getDate()).padStart(2, "0")}`);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { plan } = await api<{ plan: { id: string } }>("/coach/plans", {
        method: "POST",
        body: { clientId, title: title.trim(), description: description.trim() || null, specialization: track, startDate },
      });
      router.push(`/plans/${plan.id}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit} style={{ gap: 14 }}>
      {clients.length > 1 || !initialClientId ? (
        <label className="field">
          Client
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setTrack(clients.find((c) => c.id === e.target.value)?.specialization ?? "GENERAL");
            }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
                {c.specialization ? ` (${TRACK[c.specialization]})` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {client?.goals && <div className="alert info small">🎯 {client.fullName.split(" ")[0]}&apos;s goal: {client.goals}</div>}
      <label className="field">
        Plan title
        <input placeholder="e.g. 10K Build: Block 2" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      </label>
      <div className="form-grid">
        <label className="field">
          Track
          <select value={track} onChange={(e) => setTrack(e.target.value)}>
            {Object.entries(TRACK).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Week 1 starts (Monday)
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </label>
      </div>
      <label className="field">
        Note for the client (optional)
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this block is for and what to expect" />
      </label>
      {error && <div className="alert">{error}</div>}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn primary" disabled={busy || !title.trim() || !clientId}>
          {busy ? "Creating…" : "Create & open builder"}
        </button>
      </div>
    </form>
  );
}
