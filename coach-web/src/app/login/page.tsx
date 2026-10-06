"use client";

import { CalendarDays, ClipboardList, Eye, EyeOff, Library, Users, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Avatar } from "@/components/ui";
import { errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const DEMO = [
  { email: "coach.run@example.com", name: "Coach Bayu", note: "Running · has a client with a plan" },
  { email: "coach.swim@example.com", name: "Coach Sari", note: "Swimming · a new client to claim" },
  { email: "coach@example.com", name: "Coach Rina", note: "General fitness · empty" },
];

const FEATURES = [
  { icon: Users, text: "Claim new 1-on-1 clients the moment they pay" },
  { icon: ClipboardList, text: "Build week-by-week plans from your exercise library" },
  { icon: CalendarDays, text: "Schedule Google Meet or in-person sessions; clients get reminders" },
  { icon: Library, text: "Keep the Monthly workout library and exercise videos up to date" },
];

export default function LoginPage() {
  const { status, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "signedIn") router.replace("/");
  }, [status, router]);

  async function signIn(e?: FormEvent, override?: { email: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const creds = override ?? { email: email.trim(), password };
      await login(creds.email, creds.password);
      router.replace("/");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <section className="login-hero">
        <div className="row" style={{ gap: 12 }}>
          <span className="brand-logo" style={{ width: 44, height: 44, background: "#fff", color: "#e8341c" }}>
            <Zap size={24} />
          </span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>FitCoach</div>
            <div style={{ opacity: 0.85 }}>for coaches</div>
          </div>
        </div>
        <div>
          <h1 style={{ fontSize: 34, lineHeight: 1.15, marginBottom: 24 }}>Everything you need to coach your clients, in one place.</h1>
          <ul>
            {FEATURES.map((f) => (
              <li key={f.text}>
                <f.icon size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 15 }}>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ opacity: 0.75, fontSize: 13 }}>Clients use the FitCoach mobile app. This dashboard is for coaches only.</div>
      </section>

      <section className="login-form-wrap">
        <div className="login-card stack" style={{ gap: 16 }}>
          <div>
            <h1>Welcome back</h1>
            <div className="muted">Sign in to your coach account.</div>
          </div>
          <form className="stack" onSubmit={signIn}>
            <label className="field">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required />
            </label>
            <label className="field">
              Password
              <div className="search">
                <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required style={{ paddingRight: 40 }} />
                <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} style={{ position: "absolute", right: 4, top: 4 }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            {error && <div className="alert">{error}</div>}
            <button className="btn primary" disabled={busy} style={{ padding: "11px 14px" }}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="stack" style={{ gap: 8 }}>
            <div className="muted small strong">Demo accounts: one click to sign in</div>
            {DEMO.map((d) => (
              <button key={d.email} className="demo-btn" disabled={busy} onClick={() => signIn(undefined, { email: d.email, password: "coach-password-123" })}>
                <Avatar name={d.name} size={32} />
                <div>
                  <div className="strong">{d.name}</div>
                  <div className="muted small">{d.note}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
