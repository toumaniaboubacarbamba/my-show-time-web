"use client";

import { useEffect, useState } from "react";
import { concertsApi } from "@/lib/api";
import type { Concert, ConcertInput } from "@/lib/types";

const input =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/30";

const GENRES = ["zouglou", "coupé-décalé", "rap", "drill ivoire", "afro-jazz", "reggae"];

export default function ConcertFormModal({
  concert,
  onClose,
  onSaved,
}: {
  concert: Concert | null; // null = création
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(concert?.title ?? "");
  const [band, setBand] = useState(concert?.band ?? "");
  const [genre, setGenre] = useState(concert?.genre ?? "");
  // <input type="datetime-local"> attend "YYYY-MM-DDTHH:mm" (heure d'Abidjan = UTC)
  const [date, setDate] = useState(concert ? concert.date.slice(0, 16) : "");
  const [venue, setVenue] = useState(concert?.venue ?? "");
  const [totalSeats, setTotalSeats] = useState(String(concert?.totalSeats ?? ""));
  const [price, setPrice] = useState(String(concert?.price ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const seats = Number(totalSeats);
    const unitPrice = Number(price);
    if (!Number.isInteger(seats) || seats < 1) return setError("Le nombre de places doit être un entier positif.");
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return setError("Le prix est invalide.");

    const payload: ConcertInput = {
      title: title.trim(),
      band: band.trim(),
      genre: genre.trim().toLowerCase(),
      date: new Date(`${date}:00Z`).toISOString(),
      venue: venue.trim(),
      totalSeats: seats,
      price: unitPrice,
    };

    setSubmitting(true);
    try {
      if (concert) await concertsApi.update(concert._id, payload);
      else await concertsApi.create(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container p-6"
      >
        <h2 className="font-sora text-xl font-bold">{concert ? "Modifier le concert" : "Nouveau concert"}</h2>

        {error && (
          <p role="alert" className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Titre</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Groupe / artiste</span>
            <input required value={band} onChange={(e) => setBand(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Genre</span>
            <input required list="genres" value={genre} onChange={(e) => setGenre(e.target.value)} className={input} />
            <datalist id="genres">
              {GENRES.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Date et heure</span>
            <input required type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Lieu</span>
            <input required value={venue} onChange={(e) => setVenue(e.target.value)} className={input} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Nombre de places</span>
            <input required type="number" min={1} value={totalSeats} onChange={(e) => setTotalSeats(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Prix (FCFA)</span>
            <input required type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={input} />
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-outline-variant px-5 py-2.5 text-sm hover:bg-surface-container-high">
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-primary-container px-5 py-2.5 text-sm font-semibold text-on-primary hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Enregistrement…" : concert ? "Enregistrer" : "Créer le concert"}
          </button>
        </div>
      </form>
    </div>
  );
}
