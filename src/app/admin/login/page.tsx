"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Pogrešna lozinka");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[#E63946] text-xs font-medium tracking-widest uppercase mb-2">
            Admin
          </p>
          <h1 className="text-white text-3xl font-display">Prijava</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="username"
            autoComplete="username"
            defaultValue="admin"
            readOnly
            tabIndex={-1}
            className="sr-only"
          />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Lozinka"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#1D3557] text-white placeholder-white/30 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#E63946] transition"
            autoFocus
          />

          {error && (
            <p className="text-[#E63946] text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[#E63946] hover:bg-[#FF5A63] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition"
          >
            {loading ? "Prijava..." : "Prijavi se"}
          </button>
        </form>
      </div>
    </div>
  );
}
