"use client";

import { type FormEvent, useState } from "react";
import { useToast } from "@/components/feedback";
import { api, errorText } from "@/lib/api";
import { toLocalInput } from "@/lib/format";

interface Props {
  clients: { id: string; fullName: string }[];
  fixedClientId?: string;
  planId?: string | null;
  onDone: () => void;
}

/** Schedules an online (Google Meet) or in-person session. The client is notified by the API. */
export function ScheduleForm({ clients, fixedClientId, planId, onDone }: Props) {
  const toast = useToast();
  const tomorrow7pm = new Date();
  tomorrow7pm.setDate(tomorrow7pm.getDate() + 1);
  tomorrow7pm.setHours(19, 0, 0, 0);

  const [clientId, setClientId] = useState(fixedClientId ?? clients[0]?.id ?? "");
  const [type, setType] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [startsAt, setStartsAt] = useState(toLocalInput(tomorrow7pm));
  const [duration, setDuration] = useState(45);
  const [meetUrl, setMeetUrl] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/coach/sessions/schedule", {
        method: "POST",
        body: {
          clientId,
          planId: planId ?? null,
          type,
          startsAt: new Date(startsAt).toISOString(),
          durationMinutes: duration,
          meetUrl: type === "ONLINE" ? meetUrl.trim() || null : null,
          location: type === "OFFLINE" ? location.trim() || null : null,
          notes: notes.trim() || null,
        },
      });
      setNotes("");
      toast(`Session scheduled. ${clients.find((c) => c.id === clientId)?.fullName ?? "The client"} has been notified.`);
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="form-grid">
        {!fixedClientId && (
          <label className="field">
            Client
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          Type
          <select value={type} onChange={(e) => setType(e.target.value as "ONLINE" | "OFFLINE")}>
            <option value="ONLINE">Online (Google Meet)</option>
            <option value="OFFLINE">In person</option>
          </select>
        </label>
        <label className="field">
          Starts
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
        </label>
        <label className="field">
          Length
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {[30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} min{m === 45 ? " (standard)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      {type === "ONLINE" ? (
        <label className="field">
          <span>
            Google Meet link ·{" "}
            <a className="link" href="https://meet.google.com/new" target="_blank" rel="noreferrer">
              create one ↗
            </a>
          </span>
          <input type="url" placeholder="https://meet.google.com/abc-defg-hij" value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)} required />
        </label>
      ) : (
        <label className="field">
          Location
          <input placeholder="GBK Senayan running track, Gate 5" value={location} onChange={(e) => setLocation(e.target.value)} required />
        </label>
      )}
      <label className="field">
        Notes for the client (optional)
        <input placeholder="What we'll cover" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error && <div className="alert">{error}</div>}
      <div className="modal-actions">
        <button className="btn primary" disabled={busy || !clientId}>
          {busy ? "Scheduling…" : "Schedule & notify client"}
        </button>
      </div>
    </form>
  );
}
