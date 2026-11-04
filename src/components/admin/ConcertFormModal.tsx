"use client";

import { useEffect, useState } from "react";
import { concertsApi } from "@/lib/api";
import type { Concert, ConcertInput } from "@/lib/types";

const input =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/30";

const GENRES = ["zouglou", "coupé-décalé", "rap", "drill ivoire", "afro-jazz", "reggae", "afrobeat", "pop", "rock", "folk", "blues", "jazz", "classique", "musique traditionnelle","musique religieuse", "autre"];

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
  const [poster, setPoster] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(concert?._id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const currentPoster = posterPreview ?? concert?.posterUrl ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (posterPreview) URL.revokeObjectURL(posterPreview);
    };
  }, [posterPreview]);

  function onPickPoster(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (file) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Format accepté : JPG, PNG ou WebP.");
      if (file.size > 5 * 1024 * 1024) return setError("L'image dépasse 5 Mo.");
    }
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    setPoster(file);
    setPosterPreview(file ? URL.createObjectURL(file) : null);
  }

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
      const saved = savedId
        ? await concertsApi.update(savedId, payload)
        : await concertsApi.create(payload);
      setSavedId(saved._id);

      if (poster) {
        try {
          await concertsApi.uploadPoster(saved._id, poster);
        } catch (err) {
          setError(
            `Concert enregistré, mais l'affiche n'a pas pu être envoyée : ${
              err instanceof Error ? err.message : "erreur inconnue"
            }. Réessaie.`,
          );
          return;
        }
      }
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

        <div>
          <label htmlFor="poster" className="mb-1.5 block text-sm font-medium">
            Affiche (JPG, PNG ou WebP, 5 Mo max)
          </label>
          {currentPoster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentPoster} alt="Aperçu de l'affiche" className="mb-3 h-48 w-full rounded-xl object-cover" />
          )}
          <input
            id="poster"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPickPoster}
            className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-primary-container file:px-4 file:py-2 file:text-sm file:font-semibold file:text-on-primary hover:file:brightness-110"
          />
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
