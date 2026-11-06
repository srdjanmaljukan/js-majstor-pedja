"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

type UploadType = "single" | "before-after";
type UploadState = "idle" | "uploading" | "success" | "error";
type AdminTab = "upload" | "reviews";

interface FilePreview {
  file: File;
  url: string;
}

interface Review {
  id: string;
  name: string;
  location: string;
  text: string;
  rating: number;
  approved: boolean;
  createdAt: string;
}

// ─── DropZone ───────────────────────────────────────────────

function DropZone({
  label,
  preview,
  onChange,
}: {
  label: string;
  preview: FilePreview | null;
  onChange: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) onChange(file);
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      <p className="text-white/60 text-sm">{label}</p>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative aspect-video rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors
          ${dragging ? "border-[#E63946] bg-[#E63946]/10" : "border-white/20 bg-[#1D3557]/40 hover:border-white/40"}`}
      >
        {preview ? (
          <>
            <Image
              src={preview.url}
              alt={label}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <p className="text-white text-sm font-medium">Zamijeni</p>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/30">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 16V8m0 0-3 3m3-3 3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1"
              />
            </svg>
            <span className="text-xs">Prevuci ili klikni</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChange(f);
          }}
        />
      </div>
    </div>
  );
}

// ─── Upload tab ─────────────────────────────────────────────

function UploadTab() {
  const [tab, setTab] = useState<UploadType>("single");
  const [caption, setCaption] = useState("");
  const [singleFile, setSingleFile] = useState<FilePreview | null>(null);
  const [beforeFile, setBeforeFile] = useState<FilePreview | null>(null);
  const [afterFile, setAfterFile] = useState<FilePreview | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");

  function makePreview(file: File): FilePreview {
    return { file, url: URL.createObjectURL(file) };
  }

  function reset() {
    setSingleFile(null);
    setBeforeFile(null);
    setAfterFile(null);
    setCaption("");
    setStatus("idle");
    setMessage("");
  }

  async function handleUpload() {
    if (tab === "single" && !singleFile) return;
    if (tab === "before-after" && (!beforeFile || !afterFile)) return;

    setStatus("uploading");
    setMessage("");

    try {
      const fd = new FormData();
      fd.append("type", tab);
      if (caption) fd.append("caption", caption);
      if (tab === "single") fd.append("image", singleFile!.file);
      else {
        fd.append("before", beforeFile!.file);
        fd.append("after", afterFile!.file);
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Greška");
      }
      setStatus("success");
      setMessage("Slika je uspješno uploadovana! ✓");
      setTimeout(reset, 2500);
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Greška pri uploadu");
    }
  }

  const canUpload =
    status !== "uploading" &&
    (tab === "single" ? !!singleFile : !!beforeFile && !!afterFile);

  return (
    <div className="space-y-5">
      <div className="flex gap-2 bg-[#1D3557]/40 p-1 rounded-xl">
        {(["single", "before-after"] as UploadType[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              reset();
            }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition
              ${tab === t ? "bg-[#E63946] text-white" : "text-white/50 hover:text-white"}`}
          >
            {t === "single" ? "📷 Fotografija rada" : "↔ Prije / Poslije"}
          </button>
        ))}
      </div>

      <div className="bg-[#1D3557]/30 rounded-2xl p-6 space-y-5 border border-white/5">
        {tab === "single" ? (
          <DropZone
            label="Slika rada"
            preview={singleFile}
            onChange={(f) => setSingleFile(makePreview(f))}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <DropZone
              label="Prije"
              preview={beforeFile}
              onChange={(f) => setBeforeFile(makePreview(f))}
            />
            <DropZone
              label="Poslije"
              preview={afterFile}
              onChange={(f) => setAfterFile(makePreview(f))}
            />
          </div>
        )}

        <input
          type="text"
          placeholder="Kratak opis (opcionalno)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full bg-[#0D1B2A]/60 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#E63946]/50 transition"
        />

        {message && (
          <p
            className={`text-sm text-center ${status === "success" ? "text-green-400" : "text-[#E63946]"}`}
          >
            {message}
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={!canUpload}
          className="w-full bg-[#E63946] hover:bg-[#FF5A63] disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2"
        >
          {status === "uploading" ? (
            <>
              <svg
                className="animate-spin w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Uploadovanje...
            </>
          ) : (
            "Uploaduj na Cloudinary"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Reviews tab ────────────────────────────────────────────

function ReviewsTab() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchReviews() {
    setLoading(true);
    const res = await fetch("/api/reviews");
    if (res.ok) setReviews(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchReviews();
  }, []);

  async function handleApprove(id: string) {
    await fetch("/api/reviews", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, approved: true } : r)),
    );
  }

  async function handleDelete(id: string) {
    await fetch("/api/reviews", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    setReviews((prev) => prev.filter((r) => r.id !== id));
  }

  const pending = reviews.filter((r) => !r.approved);
  const approved = reviews.filter((r) => r.approved);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 text-white/30">
        <svg
          className="animate-spin w-6 h-6 mr-2"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
        Učitavanje...
      </div>
    );

  if (reviews.length === 0)
    return (
      <div className="text-center py-20 text-white/30">
        <div className="text-4xl mb-3">💬</div>
        <p>Nema recenzija još uvijek.</p>
      </div>
    );

  function ReviewRow({ review }: { review: Review }) {
    return (
      <div
        className={`bg-[#1D3557]/30 rounded-xl p-4 border ${review.approved ? "border-green-500/20" : "border-yellow-500/20"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-medium text-sm">
                {review.name}
              </span>
              {review.location && (
                <span className="text-white/40 text-xs">{review.location}</span>
              )}
              <span className="text-[#E9A800] text-xs">
                {"★".repeat(review.rating)}
              </span>
              {review.approved ? (
                <span className="text-green-400 text-xs bg-green-400/10 px-2 py-0.5 rounded-full">
                  Odobreno
                </span>
              ) : (
                <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded-full">
                  Na čekanju
                </span>
              )}
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              {review.text}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {!review.approved && (
              <button
                onClick={() => handleApprove(review.id)}
                className="bg-green-500/20 hover:bg-green-500/40 text-green-400 text-xs px-3 py-1.5 rounded-lg transition"
              >
                Odobri
              </button>
            )}
            <button
              onClick={() => handleDelete(review.id)}
              className="bg-[#E63946]/20 hover:bg-[#E63946]/40 text-[#E63946] text-xs px-3 py-1.5 rounded-lg transition"
            >
              Obriši
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <p className="text-yellow-400 text-xs font-medium tracking-wider uppercase mb-3">
            Na čekanju ({pending.length})
          </p>
          <div className="space-y-3">
            {pending.map((r) => (
              <ReviewRow key={r.id} review={r} />
            ))}
          </div>
        </div>
      )}
      {approved.length > 0 && (
        <div>
          <p className="text-green-400 text-xs font-medium tracking-wider uppercase mb-3">
            Odobreno ({approved.length})
          </p>
          <div className="space-y-3">
            {approved.map((r) => (
              <ReviewRow key={r.id} review={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Glavna admin stranica ──────────────────────────────────

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("upload");

  return (
    <div className="min-h-screen bg-[#0D1B2A] px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-[#E63946] text-xs font-medium tracking-widest uppercase mb-1">
              Admin
            </p>
            <h1 className="text-white text-3xl font-display">Upravljanje</h1>
          </div>
          <a
            href="/"
            className="text-white/40 hover:text-white text-sm transition"
          >
            ← Sajt
          </a>
        </div>

        <div className="flex gap-2 mb-8 bg-[#1D3557]/40 p-1 rounded-xl">
          {(["upload", "reviews"] as AdminTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition
                ${activeTab === t ? "bg-[#1D3557] text-white" : "text-white/50 hover:text-white"}`}
            >
              {t === "upload" ? "🖼️ Slike" : "💬 Recenzije"}
            </button>
          ))}
        </div>

        {activeTab === "upload" ? <UploadTab /> : <ReviewsTab />}
      </div>
    </div>
  );
}
