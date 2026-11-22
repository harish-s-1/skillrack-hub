"use client";

import { useState } from "react";

const KINDS = [
  ["idea", "Idea or feedback"],
  ["bug", "Something is broken"],
  ["points", "My points look wrong"],
  ["report", "Report a profile or abuse"],
  ["other", "Something else"],
] as const;
type Kind = (typeof KINDS)[number][0];

const HINTS: Record<Kind, string> = {
  idea: "What would make SkillRack Hub better for you?",
  bug: "What did you do, and what happened instead?",
  points: "What does SkillRack show, and what does SkillRack Hub show? Include both numbers.",
  report: "Which profile, and what is the problem?",
  other: "Tell us anything else.",
};

export default function FeedbackForm({ initialKind, slug }: { initialKind?: string; slug?: string }) {
  const first = (KINDS.find(([k]) => k === initialKind)?.[0] ?? "idea") as Kind;
  const [kind, setKind] = useState<Kind>(first);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, message, contact: contact || undefined, slug, website: website || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not send that.");
      setDone(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="panel" role="status">
        <h2>Sent</h2>
        <p>Thanks, we got it. If you left a contact, we will reply there.</p>
        <button className="btn ghost" type="button" onClick={() => setDone(false)}>Send another</button>
      </section>
    );
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="field">
        <label htmlFor="kind">What is this about?</label>
        <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          {KINDS.map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="message">Your message</label>
        <textarea id="message" className="plain" required minLength={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={HINTS[kind]} />
        <span className="muted small">{message.length} / 2000</span>
      </div>
      <div className="field">
        <label htmlFor="contact">Email or phone (optional, only if you want a reply)</label>
        <input id="contact" type="text" maxLength={120} autoComplete="off" value={contact} onChange={(e) => setContact(e.target.value)} />
      </div>
      {slug && <p className="muted small">This will be linked to the profile you came from.</p>}
      {/* Hidden from people. Bots tend to fill every field. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Sending..." : "Send"}</button>
    </form>
  );
}
