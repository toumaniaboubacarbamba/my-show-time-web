"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { favoritesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Favorite } from "@/lib/types";

export default function MyFavorites() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/favoris");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    favoritesApi
      .list()
      .then(setFavorites)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await favoritesApi.remove(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retrait impossible.");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || !user) return <div className="mx-auto h-64 max-w-4xl animate-pulse px-6" />;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Mon espace</p>
      <h1 className="font-sora text-3xl font-bold">Mes favoris</h1>
      <p className="mt-2 text-on-surface-variant">
        Tu es prévenu dès qu&apos;un de ces groupes est programmé.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-container-low" />
          ))
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant p-12 text-center sm:col-span-2">
            <p className="font-sora text-lg font-semibold">Aucun favori pour l&apos;instant</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Ajoute un groupe depuis la fiche d&apos;un concert.
            </p>
            <Link href="/" className="mt-4 inline-block rounded-xl bg-primary-container px-5 py-2.5 text-sm font-semibold text-on-primary">
              Voir les concerts
            </Link>
          </div>
        ) : (
          favorites.map((f) => (
            <article key={f.id} className="flex items-center gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-container font-sora text-lg font-bold text-on-primary">
                {f.band.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sora text-lg font-bold capitalize">{f.band}</p>
                <Link
                  href={`/?search=${encodeURIComponent(f.band)}#programme`}
                  className="text-sm text-primary hover:underline"
                >
                  Voir ses concerts
                </Link>
              </div>
              <button
                onClick={() => remove(f.id)}
                disabled={busyId === f.id}
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm hover:bg-surface-container disabled:opacity-50"
              >
                {busyId === f.id ? "…" : "Retirer"}
              </button>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
