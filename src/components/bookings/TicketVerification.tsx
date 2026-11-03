"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, bookingsApi } from "@/lib/api";
import { formatDateCompact, formatDateLong, formatPrice } from "@/lib/format";
import type { TicketCheck } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "ok"; ticket: TicketCheck }
  | { kind: "notfound" }
  | { kind: "error"; message: string };

export default function TicketVerification({ reference }: { reference: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [now] = useState(() => Date.now()); // figé au premier rendu

  useEffect(() => {
    let cancelled = false;
    bookingsApi
      .verify(reference)
      .then((ticket) => !cancelled && setState({ kind: "ok", ticket }))
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
          setState({ kind: "notfound" });
        } else {
          setState({ kind: "error", message: e.message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      {state.kind === "loading" && (
        <div className="h-80 animate-pulse rounded-3xl bg-surface-container-low" />
      )}

      {state.kind === "notfound" && (
        <Result tone="error" title="Billet introuvable" text="Cette référence ne correspond à aucune réservation." />
      )}

      {state.kind === "error" && (
        <Result tone="error" title="Vérification impossible" text={state.message} />
      )}

      {state.kind === "ok" && (() => {
        const { ticket } = state;
        const cancelled = ticket.status === "cancelled";
        const used = !cancelled && Boolean(ticket.checkedInAt);
        const past = ticket.concert ? new Date(ticket.concert.date).getTime() < now : false;

        return (
          <div className="overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface-container-low">
            <div
              className={`px-6 py-5 text-center ${
                cancelled ? "bg-error/15" : used ? "bg-primary-container/15" : "bg-tertiary/15"
              }`}
            >
              <p
                className={`font-sora text-xl font-bold ${
                  cancelled ? "text-error" : used ? "text-primary" : "text-tertiary"
                }`}
              >
                {cancelled ? "Billet annulé" : used ? "Billet déjà utilisé" : "Billet valide"}
              </p>
              {used && ticket.checkedInAt && (
                <p className="mt-1 text-sm text-on-surface-variant">
                  Entrée enregistrée le {formatDateCompact(ticket.checkedInAt)}.
                </p>
              )}
              {!cancelled && !used && past && (
                <p className="mt-1 text-sm text-on-surface-variant">Ce concert a déjà eu lieu.</p>
              )}
            </div>

            <div className="space-y-4 p-6">
              <div>
                <p className="font-sora text-2xl font-bold">{ticket.concert?.title ?? "Concert supprimé"}</p>
                {ticket.concert && <p className="text-primary">{ticket.concert.band}</p>}
              </div>

              {ticket.concert && (
                <div className="text-sm text-on-surface-variant">
                  <p className="first-letter:uppercase">{formatDateLong(ticket.concert.date)}</p>
                  <p>{ticket.concert.venue}</p>
                </div>
              )}

              <div className="border-t border-dashed border-outline-variant pt-4">
                <Row label="Places" value={String(ticket.quantity)} />
                <Row label="Montant" value={formatPrice(ticket.totalPrice)} />
                <Row label="Référence" value={ticket.reference} mono />
              </div>
            </div>
          </div>
        );
      })()}

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-primary hover:underline">
          Retour aux concerts
        </Link>
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-on-surface-variant">{label}</span>
      <span className={`text-right font-semibold ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function Result({ tone, title, text }: { tone: "error"; title: string; text: string }) {
  return (
    <div className={`rounded-3xl border p-8 text-center ${tone === "error" ? "border-error/40 bg-error/10" : ""}`}>
      <p className="font-sora text-xl font-bold text-error">{title}</p>
      <p className="mt-2 text-sm text-on-surface-variant">{text}</p>
    </div>
  );
}
