"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, bookingsApi, concertsApi, favoritesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateLong, formatPrice } from "@/lib/format";
import type { Concert } from "@/lib/types";
import { concertImage } from "./ConcertCard";

const MAX_PER_ORDER = 10;
const nf = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

type Loaded = {
  id: string;
  concert: Concert | null;
  status: "ready" | "notfound" | "error";
  loadError: string | null;
};

export default function ConcertDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();

  // `version` relance le chargement en silence (après une réservation)
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [now] = useState(() => Date.now()); // figé au premier rendu

  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<number | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [tierName, setTierName] = useState<string | null>(null); // null = première catégorie disponible

  // Favori rangé avec le groupe concerné (null = pas encore chargé)
  const [fav, setFav] = useState<{ band: string; id: string | null } | null>(null);
  const [favBusy, setFavBusy] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    concertsApi
      .get(id)
      .then((concert) => !cancelled && setLoaded({ id, concert, status: "ready", loadError: null }))
      .catch((e) => {
        if (cancelled) return;
        const missing = e instanceof ApiError && (e.status === 404 || e.status === 400);
        setLoaded({
          id,
          concert: null,
          status: missing ? "notfound" : "error",
          loadError: missing ? null : (e.message ?? "Erreur de chargement."),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  const current = loaded?.id === id ? loaded : null;
  const concert = current?.concert ?? null;
  const status = current ? current.status : "loading";
  const loadError = current?.loadError ?? null;
  const tiers = concert?.tiers ?? [];
  const tier =
    tiers.find((t) => t.name === tierName) ??
    tiers.find((t) => t.availableSeats > 0) ??
    tiers[0];

  // L'utilisateur suit-il déjà ce groupe ?
  const band = concert?.band;
  useEffect(() => {
    if (!user || !band) return;
    let cancelled = false;
    favoritesApi
      .list()
      .then((list) => {
        if (cancelled) return;
        const found = list.find((f) => f.band.toLowerCase() === band.toLowerCase());
        setFav({ band, id: found?.id ?? null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, band]);

  const favoriteId = user && fav && fav.band === band ? fav.id : null;

  const goLogin = () => router.push(`/login?next=/concerts/${id}`);

  async function toggleFavorite() {
    if (!concert) return;
    if (!user) return goLogin();
    setFavBusy(true);
    setFavError(null);
    try {
      if (favoriteId) {
        await favoritesApi.remove(favoriteId);
        setFav({ band: concert.band, id: null });
      } else {
        await favoritesApi.add(concert.band);
        const list = await favoritesApi.list();
        const found = list.find((f) => f.band.toLowerCase() === concert.band.toLowerCase());
        setFav({ band: concert.band, id: found?.id ?? null });
      }
    } catch (e) {
      setFavError(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setFavBusy(false);
    }
  }

  async function book() {
    if (!concert || !tier) return;
    if (!user) return goLogin();
    setSubmitting(true);
    setBookingError(null);
    try {
      await bookingsApi.create(concert._id, tier.name, quantity);
      setBooked(quantity);
      setQuantity(1);
      setVersion((v) => v + 1); // recharge en silence les places restantes
    } catch (e) {
      setBookingError(e instanceof Error ? e.message : "Réservation impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- États de page ---------- */

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="h-72 animate-pulse rounded-3xl bg-surface-container-low" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="h-64 animate-pulse rounded-2xl bg-surface-container-low" />
          <div className="h-64 animate-pulse rounded-2xl bg-surface-container-low" />
        </div>
      </main>
    );
  }

  if (status === "notfound" || status === "error" || !concert) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="font-sora text-3xl font-bold">
          {status === "notfound" ? "Concert introuvable" : "Oups, un problème est survenu"}
        </h1>
        <p className="mt-2 text-on-surface-variant">
          {status === "notfound" ? "Ce concert n'existe pas ou n'est plus programmé." : loadError}
        </p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-primary-container px-6 py-3 font-semibold text-on-primary">
          Retour aux concerts
        </Link>
      </main>
    );
  }

  /* ---------- Page ---------- */

  const past = new Date(concert.date).getTime() < now;
  const soldOut = concert.availableSeats <= 0;
  const tierSeats = tier?.availableSeats ?? 0;
  const tierFull = tierSeats <= 0;
  const closed = past || tierFull;
  const maxQty = Math.max(1, Math.min(MAX_PER_ORDER, tierSeats));
  const unitPrice = tier?.price ?? concert.price;
  const total = unitPrice * quantity;
  const free = tier && tier.totalSeats > 0 ? Math.round((tier.availableSeats / tier.totalSeats) * 100) : 0;

  const info = [
    { label: "Date & heure", value: formatDateLong(concert.date) },
    { label: "Lieu", value: concert.venue },
    {
      label: "Capacité",
      value: `${new Intl.NumberFormat("fr-FR").format(concert.totalSeats)} places`,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <nav className="mb-5 text-sm text-on-surface-variant" aria-label="Fil d'Ariane">
        <Link href="/" className="hover:text-on-surface">Concerts</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{concert.title}</span>
      </nav>

      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-outline-variant/60">
        <Image
          src={concertImage(concert)}
          alt=""
          fill
          priority
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-background via-background/70 to-background/20" />
        <div className="px-6 pb-8 pt-40 sm:px-10 sm:pt-56">
          <span className="rounded-full bg-secondary-container/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide capitalize">
            {concert.genre}
          </span>
          <h1 className="mt-4 font-sora text-4xl font-bold leading-tight sm:text-5xl">
            {concert.title}
          </h1>
          <p className="mt-3 text-lg text-on-surface-variant first-letter:uppercase">
            {formatDateLong(concert.date)} · {concert.venue}
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Colonne gauche */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container font-sora text-lg font-bold text-on-primary">
                  {concert.band.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Sur scène</p>
                  <p className="font-sora text-xl font-bold">{concert.band}</p>
                </div>
              </div>
              <button
                onClick={toggleFavorite}
                disabled={favBusy}
                aria-pressed={Boolean(favoriteId)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
                  favoriteId
                    ? "border-secondary bg-secondary-container/30 text-secondary"
                    : "border-outline-variant hover:bg-surface-container"
                }`}
              >
                {favoriteId ? "♥ Dans mes favoris" : "♡ Ajouter aux favoris"}
              </button>
            </div>
            {favError && <p className="mt-3 text-sm text-error">{favError}</p>}
            {!user && (
              <p className="mt-3 text-xs text-on-surface-variant">
                Suis ce groupe pour être prévenu de ses prochains concerts.
              </p>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            {info.map((i) => (
              <div key={i.label} className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-5">
                <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">{i.label}</p>
                <p className="mt-2 font-sora font-semibold first-letter:uppercase">{i.value}</p>
              </div>
            ))}
          </section>
        </div>

        {/* Colonne droite : réservation */}
        <aside className="h-fit rounded-2xl border border-outline-variant/60 bg-surface-container-low p-6 lg:sticky lg:top-24">
          <p className="text-[11px] uppercase tracking-widest text-primary">Billet spectacle</p>
          <p className="mt-1 font-sora text-lg font-bold">{concert.title}</p>

          <div className="my-5 border-t border-dashed border-outline-variant" />

          <p className="text-sm text-on-surface-variant">
            {tiers.length > 1 ? `Tarif ${tier?.name}` : "Tarif unique par place"}
          </p>
          <p className="font-sora text-4xl font-bold text-primary-container">{formatPrice(unitPrice)}</p>

          {booked !== null ? (
            <div className="mt-6 rounded-xl border border-tertiary/40 bg-tertiary/10 p-4">
              <p className="font-sora font-semibold text-tertiary">Réservation confirmée !</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                {booked} place{booked > 1 ? "s" : ""} réservée{booked > 1 ? "s" : ""}. Retrouve ton QR code dans tes réservations.
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/reservations"
                  className="rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary"
                >
                  Voir mes réservations
                </Link>
                <button
                  onClick={() => setBooked(null)}
                  className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
                >
                  Réserver encore
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 flex items-center justify-between">
                <div>
                  <p className="font-medium">Nombre de places</p>
                  <p className="text-xs text-on-surface-variant">Maximum {MAX_PER_ORDER} par commande</p>
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={closed || quantity <= 1}
                    aria-label="Retirer une place"
                    className="h-9 w-9 rounded-lg text-lg hover:bg-surface-container disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-sora font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    disabled={closed || quantity >= maxQty}
                    aria-label="Ajouter une place"
                    className="h-9 w-9 rounded-lg text-lg hover:bg-surface-container disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              {tiers.length > 1 && (
                <fieldset className="mt-6">
                  <legend className="mb-2 text-sm font-medium">Catégorie</legend>
                  <div className="space-y-2">
                    {tiers.map((t) => {
                      const full = t.availableSeats <= 0;
                      const selected = t.name === tier?.name;
                      return (
                        <label
                          key={t.name}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                            selected ? "border-primary-container bg-primary-container/10" : "border-outline-variant hover:bg-surface-container"
                          } ${full ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="tier"
                              value={t.name}
                              checked={selected}
                              disabled={full}
                              onChange={() => {
                                setTierName(t.name);
                                setQuantity(1);
                              }}
                              className="accent-primary-container"
                            />
                            <span>
                              <span className="block font-medium">{t.name}</span>
                              <span className="block text-xs text-on-surface-variant">
                                {full ? "Complet" : `${nf(t.availableSeats)} places restantes`}
                              </span>
                            </span>
                          </span>
                          <span className="font-sora font-semibold">{formatPrice(t.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <div className="mt-5 flex items-end justify-between rounded-xl bg-surface-container-lowest p-4">
                <div>
                  <p className="text-xs text-on-surface-variant">Calcul du montant</p>
                  <p className="text-sm">{quantity} × {formatPrice(unitPrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Total</p>
                  <p className="font-sora text-2xl font-bold">{formatPrice(total)}</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
                  <div className="h-full rounded-full bg-primary-container" style={{ width: `${free}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-on-surface-variant">
                  {tierFull
                    ? soldOut ? "Complet" : `${tier?.name} : complet`
                    : `${nf(tierSeats)} places restantes${tiers.length > 1 ? ` en ${tier?.name}` : ""} sur ${nf(tier?.totalSeats ?? 0)}`}
                </p>
              </div>

              {bookingError && (
                <div role="alert" className="mt-4 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
                  {bookingError}
                </div>
              )}

              <button
                onClick={book}
                disabled={closed || submitting}
                className="mt-5 w-full rounded-xl bg-primary-container py-3.5 font-sora font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {past
                  ? "Concert terminé"
                  : tierFull
                    ? soldOut ? "Complet" : "Catégorie complète"
                    : submitting
                      ? "Réservation en cours…"
                      : user
                        ? "Réserver mes places"
                        : "Se connecter pour réserver"}
              </button>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
