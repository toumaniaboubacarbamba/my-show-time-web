"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, bookingsApi } from "@/lib/api";
import { formatDateCompact, formatPrice } from "@/lib/format";
import { extractReference } from "@/lib/reference";
import type { TicketCheck } from "@/lib/types";

type Outcome = "valid" | "entered" | "used" | "cancelled" | "invalid" | "error";

type Result =
  | { kind: "valid" | "entered" | "used" | "cancelled"; ticket: TicketCheck; past: boolean }
  | { kind: "invalid" }
  | { kind: "error"; message: string };

interface HistoryItem {
  id: number;
  reference: string;
  label: string;
  outcome: Outcome;
  at: number;
}

const outcomeStyle: Record<Outcome, string> = {
  valid: "bg-tertiary/15 text-tertiary",
  entered: "bg-tertiary/15 text-tertiary",
  used: "bg-primary-container/20 text-primary",
  cancelled: "bg-error/15 text-error",
  invalid: "bg-error/15 text-error",
  error: "bg-surface-container-highest text-on-surface-variant",
};

const outcomeLabel: Record<Outcome, string> = {
  valid: "Valide",
  entered: "Entrée validée",
  used: "Déjà utilisé",
  cancelled: "Annulé",
  invalid: "Introuvable",
  error: "Erreur",
};

// Couleur de l'en-tête du résultat
const tone = {
  valid: { box: "border-tertiary/50", head: "bg-tertiary/15", text: "text-tertiary" },
  entered: { box: "border-tertiary/50", head: "bg-tertiary/15", text: "text-tertiary" },
  used: { box: "border-primary-container/60", head: "bg-primary-container/15", text: "text-primary" },
  cancelled: { box: "border-error/50", head: "bg-error/15", text: "text-error" },
  invalid: { box: "border-error/50", head: "bg-error/15", text: "text-error" },
  error: { box: "border-error/50", head: "bg-error/15", text: "text-error" },
} as const;

export default function TicketControl() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const counter = useRef(0);

  // Scan caméra : seulement si le navigateur sait lire les QR codes ET que la page est en HTTPS (ou localhost)
  const [cameraSupported] = useState(
    () => typeof window !== "undefined" && "BarcodeDetector" in window && window.isSecureContext,
  );
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  function pushHistory(reference: string, label: string, outcome: Outcome) {
    counter.current += 1;
    const item = { id: counter.current, reference, label, outcome, at: Date.now() };
    setHistory((prev) => [item, ...prev].slice(0, 10));
  }

  // Étape 1 : vérifier le billet (lecture seule)
  async function check(raw: string) {
    const reference = extractReference(raw);
    if (!reference) return;

    setBusy(true);
    setResult(null);

    let next: Result;
    let label = reference.slice(0, 8).toUpperCase();
    let outcome: Outcome;

    try {
      const ticket = await bookingsApi.verify(reference);
      const past = ticket.concert ? new Date(ticket.concert.date).getTime() < Date.now() : false;
      outcome = ticket.status === "cancelled" ? "cancelled" : ticket.checkedInAt ? "used" : "valid";
      label = ticket.concert?.title ?? label;
      next = { kind: outcome, ticket, past } as Result;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
        outcome = "invalid";
        next = { kind: "invalid" };
      } else {
        outcome = "error";
        next = { kind: "error", message: e instanceof Error ? e.message : "Vérification impossible." };
      }
    }

    pushHistory(reference, label, outcome);
    setResult(next);
    setBusy(false);
    setValue("");
    inputRef.current?.focus();
  }

  // Étape 2 : enregistrer l'entrée (une seule fois par billet, garanti par l'API)
  async function validateEntry() {
    if (!result || result.kind !== "valid") return;
    const { ticket, past } = result;

    setBusy(true);
    try {
      const entered = await bookingsApi.checkIn(ticket.reference);
      setResult({ kind: "entered", ticket: entered, past });
      pushHistory(ticket.reference, entered.concert?.title ?? ticket.reference.slice(0, 8).toUpperCase(), "entered");
      setBusy(false);
      inputRef.current?.focus();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Quelqu'un vient de le valider : on réaffiche l'état réel (« déjà utilisé »)
        await check(ticket.reference);
        return;
      }
      setResult({ kind: "error", message: e instanceof Error ? e.message : "Validation impossible." });
      setBusy(false);
    }
  }

  // Caméra
  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        timer = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              setScanning(false);
              check(codes[0].rawValue);
            }
          } catch {
            /* image pas prête, on réessaie */
          }
        }, 300);
      } catch {
        setCameraError("Impossible d'accéder à la caméra. Vérifie l'autorisation du navigateur.");
        setScanning(false);
      }
    })();

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // `check` est volontairement exclu : on ne relance pas la caméra à chaque rendu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const heading: Record<Result["kind"], string> = {
    valid: "Billet valide",
    entered: "Entrée validée",
    used: "Billet déjà utilisé",
    cancelled: "Billet annulé",
    invalid: "Billet introuvable",
    error: "Vérification impossible",
  };

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Administration</p>
      <h1 className="font-sora text-3xl font-bold">Contrôle des billets</h1>
      <p className="mt-2 text-on-surface-variant">
        Saisis ou colle la référence du billet (ou le lien du QR code), vérifie-le, puis valide l&apos;entrée.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          check(value);
        }}
        className="mt-8 flex flex-col gap-3 sm:flex-row"
      >
        <input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="72c77cc1-0fc8-4215-99b7-afe4262afaa4"
          className="flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-mono text-sm outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/30"
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="rounded-xl bg-primary-container px-6 py-3 font-sora font-semibold text-on-primary hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Patiente…" : "Vérifier"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {cameraSupported ? (
          <button
            onClick={() => {
              setCameraError(null);
              setScanning((v) => !v);
            }}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm hover:bg-surface-container"
          >
            {scanning ? "Arrêter la caméra" : "Scanner avec la caméra"}
          </button>
        ) : (
          <p className="text-xs text-on-surface-variant">
            Le scan par caméra demande une page en HTTPS : il sera disponible une fois le site déployé.
          </p>
        )}
        {cameraError && <p className="text-sm text-error">{cameraError}</p>}
      </div>

      {scanning && (
        <video
          ref={videoRef}
          playsInline
          muted
          className="mt-4 aspect-video w-full max-w-md rounded-2xl border border-outline-variant bg-black object-cover"
        />
      )}

      {/* Résultat */}
      {result && (
        <section aria-live="polite" className={`mt-8 overflow-hidden rounded-3xl border ${tone[result.kind].box}`}>
          <div className={`px-6 py-6 text-center ${tone[result.kind].head}`}>
            <p className={`font-sora text-3xl font-bold ${tone[result.kind].text}`}>{heading[result.kind]}</p>

            {result.kind === "used" && result.ticket.checkedInAt && (
              <p className="mt-2 text-sm text-on-surface-variant">
                Entrée déjà enregistrée le {formatDateCompact(result.ticket.checkedInAt)}.
              </p>
            )}
            {result.kind === "entered" && result.ticket.checkedInAt && (
              <p className="mt-2 text-sm text-on-surface-variant">
                Enregistrée le {formatDateCompact(result.ticket.checkedInAt)}.
              </p>
            )}
            {(result.kind === "valid" || result.kind === "entered") && result.past && (
              <p className="mt-2 text-sm text-on-surface-variant">Ce concert a déjà eu lieu.</p>
            )}
            {result.kind === "invalid" && (
              <p className="mt-2 text-sm text-on-surface-variant">Aucune réservation ne correspond à cette référence.</p>
            )}
            {result.kind === "error" && <p className="mt-2 text-sm text-on-surface-variant">{result.message}</p>}
          </div>

          {result.kind !== "invalid" && result.kind !== "error" && (
            <div className="space-y-3 bg-surface-container-low p-6">
              <p className="font-sora text-xl font-bold">{result.ticket.concert?.title ?? "Concert supprimé"}</p>
              {result.ticket.concert && (
                <p className="text-sm text-on-surface-variant">
                  {result.ticket.concert.band} · {formatDateCompact(result.ticket.concert.date)} · {result.ticket.concert.venue}
                </p>
              )}
              <div className="flex flex-wrap gap-6 border-t border-dashed border-outline-variant pt-3 text-sm">
                <p>
                  <span className="text-on-surface-variant">Places : </span>
                  <span className="font-sora text-lg font-bold">{result.ticket.quantity}</span>
                </p>
                <p>
                  <span className="text-on-surface-variant">Montant : </span>
                  <span className="font-semibold">{formatPrice(result.ticket.totalPrice)}</span>
                </p>
              </div>

              {result.kind === "valid" && (
                <button
                  onClick={validateEntry}
                  disabled={busy}
                  className="mt-2 w-full rounded-xl bg-tertiary-container py-3.5 font-sora font-semibold text-background transition hover:brightness-110 disabled:opacity-60"
                >
                  {busy ? "Validation…" : "Valider l'entrée"}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* Historique de la session */}
      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="font-sora text-lg font-bold">Derniers contrôles</h2>
          <ul className="mt-3 divide-y divide-outline-variant/40 rounded-2xl border border-outline-variant/60 bg-surface-container-low">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{h.label}</p>
                  <p className="font-mono text-xs text-on-surface-variant">{h.reference.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-on-surface-variant">
                    {new Date(h.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${outcomeStyle[h.outcome]}`}>
                    {outcomeLabel[h.outcome]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
