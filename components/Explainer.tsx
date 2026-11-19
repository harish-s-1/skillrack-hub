"use client";

import { useState } from "react";

/** Renders the model's Markdown as plain React nodes. No HTML is ever injected. */
function renderExplanation(text: string) {
  const blocks = text.split(/\n(?=## )/);
  return blocks.map((b, i) => {
    const m = b.match(/^## (.+)\n?([\s\S]*)$/);
    const title = m ? m[1] : "";
    const body = (m ? m[2] : b).trim();
    return (
      <div key={i}>
        {title && <h3>{title}</h3>}
        {body.split(/\n{2,}/).map((para, j) => (
          <p key={j}>
            {para.split(/(`[^`]+`)/g).map((part, k) =>
              part.startsWith("`") && part.endsWith("`") && part.length > 2 ? <code key={k}>{part.slice(1, -1)}</code> : part,
            )}
          </p>
        ))}
      </div>
    );
  });
}

export default function Explainer() {
  const [problem, setProblem] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("Python");
  const [level, setLevel] = useState<"beginner" | "intermediate">("beginner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [out, setOut] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOut("");
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problem, code, language, level }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not explain that.");
      setOut(body.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not explain that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="panel" onSubmit={go}>
        <div className="field">
          <label htmlFor="problem">Problem statement</label>
          <textarea id="problem" required maxLength={4000} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="Paste the SkillRack problem text here" />
        </div>
        <div className="field">
          <label htmlFor="code">Your solution</label>
          <textarea id="code" required maxLength={8000} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste the code you submitted" style={{ minHeight: 220 }} />
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="lang">Language</label>
            <select id="lang" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {["Python", "Java", "C", "C++", "SQL", "JavaScript"].map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="level">Explain it for</label>
            <select id="level" value={level} onChange={(e) => setLevel(e.target.value as "beginner" | "intermediate")}>
              <option value="beginner">A beginner</option>
              <option value="intermediate">Someone comfortable with code</option>
            </select>
          </div>
        </div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? "Reading your code..." : "Explain my code"}</button>
      </form>

      {out && (
        <section className="panel explain" aria-live="polite">
          {renderExplanation(out)}
        </section>
      )}
    </>
  );
}
