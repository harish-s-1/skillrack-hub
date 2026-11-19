"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddProfileForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [show, setShow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, showOnLeaderboard: show }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      router.push(`/u/${body.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="field">
        <label htmlFor="url">Your SkillRack resume link</label>
        <input
          id="url"
          type="url"
          required
          inputMode="url"
          autoComplete="off"
          placeholder="https://www.skillrack.com/profile/123456/abcdef..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <label className="check">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        <span>Show my name and points on the college leaderboard. You can leave this off and still use your own page.</span>
      </label>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Reading your profile..." : "Track my progress"}</button>
    </form>
  );
}
