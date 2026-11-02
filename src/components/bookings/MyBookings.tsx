"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { bookingsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Booking } from "@/lib/types";
import BookingCard from "./BookingCard";

type Tab = "upcoming" | "past" | "cancelled";

const TABS: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "À venir" },
  { id: "past", label: "Passées" },
  { id: "cancelled", label: "Annulées" },
];

function classify(b: Booking): Tab {
  if (b.status === "cancelled") return "cancelled";
  const date = b.concert ? new Date(b.concert.date).getTime() : 0;
  return date >= Date.now() ? "upcoming" : "past";
}

export default function MyBookings() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");

  // Page réservée aux utilisateurs connectés
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/reservations");
  }, [authLoading, user, router]);

  // Incrémenter `version` relance le chargement (après une annulation par ex.)
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    bookingsApi
      .mine()
      .then((list) => {
        if (cancelled) return;
        setBookings(list);
        setError(null);
      })
      .catch((e) => !cancelled && setError(e.message ?? "Impossible de charger tes réservations."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user, version]);

  async function cancel(id: string) {
    await bookingsApi.cancel(id);
    setVersion((v) => v + 1);
  }

  const groups = useMemo(() => {
    const g: Record<Tab, Booking[]> = { upcoming: [], past: [], cancelled: [] };
    bookings.forEach((b) => g[classify(b)].push(b));
    const time = (b: Booking) => (b.concert ? new Date(b.concert.date).getTime() : 0);
    g.upcoming.sort((a, b) => time(a) - time(b));
    g.past.sort((a, b) => time(b) - time(a));
    g.cancelled.sort((a, b) => time(b) - time(a));
    return g;
  }, [bookings]);

  if (authLoading || !user) return <div className="mx-auto h-64 max-w-4xl animate-pulse px-6" />;

  const current = groups[tab];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Mon espace</p>
      <h1 className="font-sora text-3xl font-bold">Mes réservations</h1>

      <div className="mt-6 flex gap-2 border-b border-outline-variant/60">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition ${
              tab === t.id
                ? "border-primary-container text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t.label} <span className="ml-1 text-xs opacity-70">({groups[t.id].length})</span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-5">
        {error ? (
          <div role="alert" className="rounded-2xl border border-error/40 bg-error/10 p-6 text-error">
            {error}
          </div>
        ) : loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface-container-low" />
          ))
        ) : current.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant p-12 text-center">
            <p className="font-sora text-lg font-semibold">Rien ici pour l&apos;instant</p>
            {tab === "upcoming" && (
              <Link href="/" className="mt-4 inline-block rounded-xl bg-primary-container px-5 py-2.5 text-sm font-semibold text-on-primary">
                Découvrir les concerts
              </Link>
            )}
          </div>
        ) : (
          current.map((b) => (
            <BookingCard key={b._id} booking={b} canCancel={tab === "upcoming"} onCancel={cancel} />
          ))
        )}
      </div>
    </main>
  );
}
