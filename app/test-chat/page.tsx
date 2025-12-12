"use client";

import { useState } from "react";

export default function TestChat() {
  const [out, setOut] = useState<string>("");

  async function run() {
    const res = await fetch("/api/chat", { method: "POST" });
    const data = await res.json();
    setOut(JSON.stringify(data, null, 2));
  }

  return (
    <div className="p-6">
      <button className="rounded bg-white px-4 py-2 text-black" onClick={run}>
        Test /api/chat
      </button>
      <pre className="mt-4 whitespace-pre-wrap text-sm">{out}</pre>
    </div>
  );
}
