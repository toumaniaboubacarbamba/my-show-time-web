"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateLong, formatPrice } from "@/lib/format";
import type { Booking } from "@/lib/types";
import QrCode from "./QrCode";

export default function BookingCard({
  booking,
  canCancel,
  onCancel,
}: {
  booking: Booking;
  canCancel: boolean;
  onCancel: (id: string) => Promise<void>;
}) {
  const [showQr, setShowQr] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelled = booking.status === "cancelled";
  const concert = booking.concert;

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await onCancel(booking._id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Annulation impossible.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={`rounded-2xl border bg-surface-container-low p-6 ${
        cancelled ? "border-outline-variant/40 opacity-70" : "border-outline-variant/60"
      }`}
    >
      <div className="flex flex-col gap-6 md:flex-row md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                cancelled
                  ? "bg-error/15 text-error"
                  : "bg-tertiary/15 text-tertiary"
              }`}
            >
              {cancelled ? "Annulée" : "Confirmée"}
            </span>
            <span className="text-xs text-on-surface-variant">
              Réf. {booking.reference.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <h3 className="font-sora text-xl font-bold">{concert?.title ?? "Concert supprimé"}</h3>
          {concert && (
            <>
              <p className="text-primary">{concert.band}</p>
              <p className="text-sm text-on-surface-variant first-letter:uppercase">
                {formatDateLong(concert.date)} · {concert.venue}
              </p>
            </>
          )}

          <p className="text-sm">
            {booking.quantity} place{booking.quantity > 1 ? "s" : ""}{" "}
            <span className="text-on-surface-variant">en {booking.tierName}</span> ·{" "}
            <span className="font-sora font-semibold">{formatPrice(booking.totalPrice)}</span>
          </p>
        </div>

        {showQr && !cancelled && (
          <div className="md:pl-6">
            <QrCode bookingId={booking._id} reference={booking.reference} />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-error/40 bg-error/10 px-4 py-2 text-sm text-error">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-outline-variant pt-4">
        {!cancelled && (
          <button
            onClick={() => setShowQr((v) => !v)}
            className="rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary hover:brightness-110"
          >
            {showQr ? "Masquer le QR code" : "Afficher le QR code"}
          </button>
        )}
        <Link
          href={`/billet/${booking.reference}`}
          className="rounded-lg border border-outline-variant px-4 py-2 text-sm hover:bg-surface-container"
        >
          Page de vérification
        </Link>

        {canCancel && !cancelled && (
          <div className="ml-auto flex items-center gap-2">
            {confirming ? (
              <>
                <span className="text-sm text-on-surface-variant">Annuler cette réservation ?</span>
                <button
                  onClick={cancel}
                  disabled={busy}
                  className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {busy ? "Annulation…" : "Oui, annuler"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
                >
                  Non
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="rounded-lg border border-error/50 px-4 py-2 text-sm text-error hover:bg-error/10"
              >
                Annuler
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
