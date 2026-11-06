"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Service {
  id: number;
  serviceDate: string;
  unit: string | null;
  warrantyPaid: boolean;
  warrantyExpiresAt: string | null;
  renewalContacted: boolean;
  note: string | null;
}

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  address: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  services: Service[];
}

interface Expiring {
  serviceId: number
  clientId: number
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  unit: string | null
  warrantyPaid: boolean
  dueDate: string
  daysLeft: number
}

const inputCls =
  "w-full bg-[#0D1B2A]/60 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#E63946]/50 transition";

const todayIso = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, lokalno vrijeme

function fmt(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
}

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Greška");
  return data;
}

async function run(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    window.alert(e instanceof Error ? e.message : "Greška");
  }
}

// ─── Forma za klijenta ──────────────────────────────────────

type ClientValues = {
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  email: string;
  note: string;
};

function ClientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Client;
  onSave: (v: ClientValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<ClientValues>({
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    address: initial?.address ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    note: initial?.note ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set =
    (k: keyof ClientValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setV({ ...v, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.phone.trim() && !v.email.trim()) {
      setError("Unesite bar telefon ili email.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 bg-[#1D3557]/30 border border-white/10 rounded-2xl p-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          className={inputCls}
          placeholder="Ime *"
          value={v.firstName}
          onChange={set("firstName")}
          required
        />
        <input
          className={inputCls}
          placeholder="Prezime *"
          value={v.lastName}
          onChange={set("lastName")}
          required
        />
      </div>
      <input
        className={inputCls}
        placeholder="Adresa *"
        value={v.address}
        onChange={set("address")}
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          className={inputCls}
          placeholder="Telefon"
          type="tel"
          value={v.phone}
          onChange={set("phone")}
        />
        <input
          className={inputCls}
          placeholder="Email"
          type="email"
          value={v.email}
          onChange={set("email")}
        />
      </div>
      <p className="text-white/30 text-xs">
        Bar jedno od polja telefon / email je obavezno.
      </p>
      <textarea
        className={inputCls + " resize-none"}
        rows={2}
        placeholder="Napomena"
        value={v.note}
        onChange={set("note")}
      />

      {error && <p className="text-[#E63946] text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-[#E63946] hover:bg-[#FF5A63] disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition"
        >
          {saving ? "Čuvanje..." : "Sačuvaj"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 text-white/50 hover:text-white text-sm transition"
        >
          Otkaži
        </button>
      </div>
    </form>
  );
}

// ─── Forma za servis ────────────────────────────────────────

type ServiceValues = {
  serviceDate: string;
  unit: string;
  warrantyPaid: boolean;
  note: string;
};

function ServiceForm({
  onSave,
  onCancel,
}: {
  onSave: (v: ServiceValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<ServiceValues>({
    serviceDate: todayIso(),
    unit: "",
    warrantyPaid: false,
    note: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 bg-[#0D1B2A]/60 border border-white/10 rounded-xl p-3"
    >
      <input
        type="date"
        className={inputCls + " [color-scheme:dark]"}
        value={v.serviceDate}
        onChange={(e) => setV({ ...v, serviceDate: e.target.value })}
        required
      />
      <input
        className={inputCls}
        placeholder="Uređaj (npr. dnevna soba, Gree 12k)"
        value={v.unit}
        onChange={(e) => setV({ ...v, unit: e.target.value })}
      />
      <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={v.warrantyPaid}
          onChange={(e) => setV({ ...v, warrantyPaid: e.target.checked })}
          className="w-4 h-4 accent-[#E63946]"
        />
        Garancija plaćena (važi godinu dana)
      </label>
      <input
        className={inputCls}
        placeholder="Napomena"
        value={v.note}
        onChange={(e) => setV({ ...v, note: e.target.value })}
      />

      {error && <p className="text-[#E63946] text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-[#E63946] hover:bg-[#FF5A63] disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition"
        >
          {saving ? "Čuvanje..." : "Dodaj servis"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 text-white/50 hover:text-white text-sm transition"
        >
          Otkaži
        </button>
      </div>
    </form>
  );
}

// ─── Kartica klijenta ───────────────────────────────────────

function PhoneLink({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);
  const dial = phone.replace(/[^\d+]/g, ""); // ukloni razmake i crtice

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[#E63946]"
      >
        {phone}
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <span className="absolute left-0 top-full mt-1 z-20 flex flex-col min-w-[130px] bg-[#0D1B2A] border border-white/10 rounded-xl shadow-lg overflow-hidden">
            <a
              href={`tel:${dial}`}
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 text-sm text-white hover:bg-white/10"
            >
              📞 Pozovi
            </a>
            <a
              href={`sms:${dial}`}
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 text-sm text-white hover:bg-white/10 border-t border-white/10"
            >
              💬 SMS
            </a>
          </span>
        </>
      )}
    </span>
  );
}

function ClientCard({
  client,
  onChanged,
}: {
  client: Client;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [addingService, setAddingService] = useState(false);
  const today = todayIso();

  if (editing) {
    return (
      <ClientForm
        initial={client}
        onCancel={() => setEditing(false)}
        onSave={async (v) => {
          await api("/api/clients", "PATCH", { id: client.id, ...v });
          setEditing(false);
          onChanged();
        }}
      />
    );
  }

  return (
    <div className="bg-[#1D3557]/30 border border-white/5 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-medium">
            {client.firstName} {client.lastName}
          </p>
          <p className="text-white/50 text-sm">{client.address}</p>
          <div className="text-sm mt-1 space-x-3">
            {client.phone && <PhoneLink phone={client.phone} />}
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="text-white/60 break-all"
              >
                {client.email}
              </a>
            )}
          </div>
          {client.note && (
            <p className="text-white/40 text-xs mt-1">{client.note}</p>
          )}
        </div>
        <div className="flex gap-3 shrink-0 text-xs">
          <button
            onClick={() => setEditing(true)}
            className="text-white/50 hover:text-white"
          >
            Izmijeni
          </button>
          <button
            onClick={() =>
              run(async () => {
                if (
                  !window.confirm(
                    `Obrisati klijenta ${client.firstName} ${client.lastName} i sve njegove servise?`,
                  )
                )
                  return;
                await api("/api/clients", "DELETE", { id: client.id });
                onChanged();
              })
            }
            className="text-[#E63946]/70 hover:text-[#E63946]"
          >
            Obriši
          </button>
        </div>
      </div>

      {client.services.length > 0 && (
        <div className="space-y-2 border-t border-white/5 pt-3">
          {client.services.map((s) => {
            const expired =
              s.warrantyPaid &&
              s.warrantyExpiresAt !== null &&
              s.warrantyExpiresAt < today;
            return (
              <div
                key={s.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-white/80">
                    {fmt(s.serviceDate)}
                    {s.unit && (
                      <span className="text-white/40"> · {s.unit}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {s.warrantyPaid ? (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          expired
                            ? "bg-white/10 text-white/40"
                            : "bg-green-400/10 text-green-400"
                        }`}
                      >
                        {expired ? "Garancija istekla" : "Garancija do"}{" "}
                        {fmt(s.warrantyExpiresAt)}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/40">
                        Bez garancije
                      </span>
                    )}
                    {s.renewalContacted && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-300">
                        Kontaktiran
                      </span>
                    )}
                  </div>
                  {s.note && (
                    <p className="text-white/30 text-xs mt-1">{s.note}</p>
                  )}
                </div>
                <button
                  onClick={() =>
                    run(async () => {
                      if (!window.confirm("Obrisati ovaj servis?")) return;
                      await api("/api/services", "DELETE", { id: s.id });
                      onChanged();
                    })
                  }
                  className="text-white/30 hover:text-[#E63946] text-lg leading-none shrink-0"
                  aria-label="Obriši servis"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {addingService ? (
        <ServiceForm
          onCancel={() => setAddingService(false)}
          onSave={async (v) => {
            await api("/api/services", "POST", { clientId: client.id, ...v });
            setAddingService(false);
            onChanged();
          }}
        />
      ) : (
        <button
          onClick={() => setAddingService(true)}
          className="w-full bg-white/5 hover:bg-white/10 text-white/70 text-sm py-2 rounded-xl transition"
        >
          + Dodaj servis
        </button>
      )}
    </div>
  );
}

// ─── Glavni tab ─────────────────────────────────────────────

export default function ClientsTab() {
  const [clients, setClients] = useState<Client[]>([]);
  const [expiring, setExpiring] = useState<Expiring[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, e] = await Promise.all([
        api("/api/clients", "GET"),
        api("/api/services", "GET"),
      ]);
      setClients(c);
      setExpiring(e);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri učitavanju");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.firstName, c.lastName, c.address, c.phone, c.email]
        .filter(Boolean)
        .some((f) => (f as string).toLowerCase().includes(q)),
    );
  }, [clients, search]);

  if (loading)
    return <div className="text-center py-20 text-white/30">Učitavanje...</div>;

  return (
    <div className="space-y-5">
      {error && <p className="text-[#E63946] text-sm text-center">{error}</p>}

      {expiring.length > 0 && (
  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-3">
    <p className="text-yellow-400 text-xs font-medium tracking-wider uppercase">
      Podsjetnici ({expiring.length})
    </p>
    {expiring.map((e) => (
      <div key={e.serviceId} className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white text-sm font-medium">
            {e.firstName} {e.lastName}
          </p>
          <div className="text-sm space-x-3">
            {e.phone && <PhoneLink phone={e.phone} />}
            {e.email && <span className="text-white/50 break-all">{e.email}</span>}
          </div>
          <p className="text-yellow-300/80 text-xs mt-0.5">
            {e.warrantyPaid ? 'Garancija' : 'Godina od servisa'}{' '}
            {e.daysLeft < 0
              ? `istekla prije ${-e.daysLeft} d`
              : e.daysLeft === 0
              ? 'ističe danas'
              : `ističe za ${e.daysLeft} d`}{' '}
            ({fmt(e.dueDate)})
            {e.unit && <span className="text-white/40"> · {e.unit}</span>}
          </p>
        </div>
        <button
          onClick={() =>
            run(async () => {
              await api('/api/services', 'PATCH', { id: e.serviceId, renewalContacted: true })
              load()
            })
          }
          className="shrink-0 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 text-xs px-3 py-1.5 rounded-lg transition"
        >
          Kontaktiran ✓
        </button>
      </div>
    ))}
  </div>
)}

      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder="Pretraga (ime, adresa, telefon...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={() => setShowNew(!showNew)}
          className="shrink-0 bg-[#E63946] hover:bg-[#FF5A63] text-white text-sm font-medium px-4 rounded-xl transition"
        >
          {showNew ? "×" : "+ Novi"}
        </button>
      </div>

      {showNew && (
        <ClientForm
          onCancel={() => setShowNew(false)}
          onSave={async (v) => {
            await api("/api/clients", "POST", v);
            setShowNew(false);
            load();
          }}
        />
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <div className="text-4xl mb-3">❄️</div>
          <p>
            {clients.length === 0
              ? "Nema klijenata još uvijek."
              : "Nema rezultata pretrage."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <ClientCard key={c.id} client={c} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
