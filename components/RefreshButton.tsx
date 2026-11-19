"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function go() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/profile/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not refresh.");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not refresh.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      <button className="btn ghost" onClick={go} disabled={busy} type="button">{busy ? "Refreshing..." : "Refresh now"}</button>
      {msg && <span className="err small" role="alert">{msg}</span>}
    </div>
  );
}
