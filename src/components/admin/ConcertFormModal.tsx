"use client";

import { useEffect, useState } from "react";
import { concertsApi } from "@/lib/api";
import type { Concert, ConcertInput, TierInput } from "@/lib/types";

const input =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/30";

const GENRES = ["zouglou", "coupé-décalé", "rap", "drill ivoire", "afro-jazz", "reggae", "afrobeat", "pop", "rock", "folk", "blues", "jazz", "classique", "musique traditionnelle","musique religieuse", "autre"];

type TierRow = { key: number; name: string; price: string; totalSeats: string; sold: number };

let rowId = 0;
const newRow = (name = "", price = "", totalSeats = "", sold = 0): TierRow => ({
  key: ++rowId,
  name,
  price,
  totalSeats,
  sold,
});

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
  const [tiers, setTiers] = useState<TierRow[]>(() => {
    if (!concert) return [newRow("Standard")];
    const source = concert.tiers?.length
      ? concert.tiers
      : [{ name: "Standard", price: concert.price, totalSeats: concert.totalSeats, availableSeats: concert.availableSeats }];
    return source.map((t) => newRow(t.name, String(t.price), String(t.totalSeats), t.totalSeats - t.availableSeats));
  });
  const [poster, setPoster] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(concert?._id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const currentPoster = posterPreview ?? concert?.posterUrl ?? null;
  const capacity = tiers.reduce((sum, t) => sum + (Number(t.totalSeats) || 0), 0);

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

  const updateTier = (key: number, patch: Partial<TierRow>) =>
    setTiers((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addTier = () => setTiers((rows) => [...rows, newRow()]);
  const removeTier = (key: number) => setTiers((rows) => rows.filter((r) => r.key !== key));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed: TierInput[] = [];
    const names = new Set<string>();
    for (const row of tiers) {
      const name = row.name.trim();
      const seats = Number(row.totalSeats);
      const unitPrice = Number(row.price);
      if (!name) return setError("Chaque catégorie doit avoir un nom.");
      if (names.has(name.toLowerCase())) return setError(`Catégorie en double : ${name}.`);
      names.add(name.toLowerCase());
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return setError(`« ${name} » : le prix est invalide.`);
      if (!Number.isInteger(seats) || seats < 1) return setError(`« ${name} » : le nombre de places doit être un entier positif.`);
      if (seats < row.sold) return setError(`« ${name} » : ${row.sold} places sont déjà réservées.`);
      parsed.push({ name, price: unitPrice, totalSeats: seats });
    }
    if (parsed.length === 0) return setError("Ajoute au moins une catégorie de billets.");

    const payload: ConcertInput = {
      title: title.trim(),
      band: band.trim(),
      genre: genre.trim().toLowerCase(),
      date: new Date(`${date}:00Z`).toISOString(),
      venue: venue.trim(),
      tiers: parsed,
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

        <fieldset className="space-y-3">
          <legend className="mb-1.5 text-sm font-medium">Catégories de billets</legend>

          {tiers.map((t, i) => (
            <div key={t.key} className="space-y-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
              <div className="flex items-center gap-3">
                <input
                  required
                  aria-label={`Nom de la catégorie ${i + 1}`}
                  placeholder="Standard, VIP…"
                  value={t.name}
                  disabled={t.sold > 0}
                  onChange={(e) => updateTier(t.key, { name: e.target.value })}
                  className={input}
                />
                <button
                  type="button"
                  onClick={() => removeTier(t.key)}
                  disabled={tiers.length === 1 || t.sold > 0}
                  className="shrink-0 rounded-lg border border-error/50 px-3 py-2 text-xs text-error hover:bg-error/10 disabled:opacity-40"
                >
                  Retirer
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-on-surface-variant">Prix (FCFA)</span>
                  <input required type="number" min={0} value={t.price} onChange={(e) => updateTier(t.key, { price: e.target.value })} className={input} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-on-surface-variant">Places</span>
                  <input required type="number" min={Math.max(1, t.sold)} value={t.totalSeats} onChange={(e) => updateTier(t.key, { totalSeats: e.target.value })} className={input} />
                </label>
              </div>

              {t.sold > 0 && (
                <p className="text-xs text-on-surface-variant">
                  {t.sold} place{t.sold > 1 ? "s" : ""} déjà réservée{t.sold > 1 ? "s" : ""} : le nom est verrouillé et la catégorie ne peut pas être retirée.
                </p>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between">
            <button type="button" onClick={addTier} className="rounded-lg border border-outline-variant px-4 py-2 text-sm hover:bg-surface-container-high">
              + Ajouter une catégorie
            </button>
            <p className="text-xs text-on-surface-variant">Capacité totale : {new Intl.NumberFormat("fr-FR").format(capacity)} places</p>
          </div>
        </fieldset>

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
