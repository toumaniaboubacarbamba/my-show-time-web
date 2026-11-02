"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { concertsApi } from "@/lib/api";
import type { Concert } from "@/lib/types";
import ConcertCard from "./ConcertCard";
import Pagination from "./Pagination";

const LIMIT = 9;

// value = ce qui est envoyé à l'API, label = ce qui est affiché
const GENRES = [
  { value: "zouglou", label: "Zouglou" },
  { value: "coupé-décalé", label: "Coupé-décalé" },
  { value: "rap", label: "Rap" },
  { value: "drill ivoire", label: "Drill ivoire" },
  { value: "afro-jazz", label: "Afro-jazz" },
  { value: "reggae", label: "Reggae" },
];

export default function ConcertBrowser() {
  const router = useRouter();
  const params = useSearchParams();

  const search = params.get("search") ?? "";
  const genre = params.get("genre") ?? "";
  const date = params.get("date") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;

  const [searchInput, setSearchInput] = useState(search);
  // Le résultat est rangé avec la clé des filtres qui l'ont produit : tant qu'elle
  // ne correspond pas aux filtres actuels, on affiche le squelette de chargement.
  const [result, setResult] = useState<{
    key: string;
    items: Concert[];
    total: number;
    error: string | null;
  } | null>(null);
  const key = `${search}|${genre}|${date}|${page}`;

  // Met à jour l'URL (source de vérité des filtres)
  const setParams = useCallback(
    (changes: Record<string, string | number | null>, resetPage = true) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(changes).forEach(([k, v]) => {
        if (v === null || v === "") next.delete(k);
        else next.set(k, String(v));
      });
      if (resetPage) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [params, router],
  );

  // Recherche avec délai (évite un appel API à chaque lettre)
  useEffect(() => {
    if (searchInput === search) return;
    const t = setTimeout(() => setParams({ search: searchInput }), 400);
    return () => clearTimeout(t);
  }, [searchInput, search, setParams]);

  // Chargement des concerts quand les filtres changent
  useEffect(() => {
    let cancelled = false;
    concertsApi
      .list({ search, genre, date, page, limit: LIMIT })
      .then((res) => !cancelled && setResult({ key, items: res.items, total: res.total, error: null }))
      .catch((e) => !cancelled && setResult({ key, items: [], total: 0, error: e.message ?? "Chargement impossible." }));
    return () => {
      cancelled = true;
    };
  }, [key, search, genre, date, page]);

  const loading = result?.key !== key;
  const concerts = result?.items ?? [];
  const total = result?.total ?? 0;
  const error = loading ? null : (result?.error ?? null);

  const hasFilters = Boolean(search || genre || date);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const field =
    "rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/30";

  return (
    <section id="programme" className="mx-auto max-w-6xl scroll-mt-24 px-6">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Programmation</p>
          <h2 className="font-sora text-3xl font-bold">Les prochains concerts</h2>
        </div>
        {!loading && !error && (
          <p className="text-sm text-on-surface-variant">
            {total} concert{total > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Filtres */}
      <div className="mb-6 grid gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 md:grid-cols-[1fr_200px_180px_auto]">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Titre, groupe ou lieu…"
          className={field}
        />
        <select value={genre} onChange={(e) => setParams({ genre: e.target.value })} className={field}>
          <option value="">Tous les genres</option>
          {GENRES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setParams({ date: e.target.value })}
          className={field}
        />
        <button
          onClick={() => {
            setSearchInput("");
            router.replace("/", { scroll: false });
          }}
          disabled={!hasFilters}
          className="rounded-xl border border-outline-variant px-4 py-3 text-sm transition hover:bg-surface-container disabled:opacity-40"
        >
          Réinitialiser
        </button>
      </div>

      {/* Contenu */}
      {error ? (
        <div role="alert" className="rounded-2xl border border-error/40 bg-error/10 p-6 text-error">
          {error}
        </div>
      ) : loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-surface-container-low" />
          ))}
        </div>
      ) : concerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant p-12 text-center">
          <p className="font-sora text-lg font-semibold">Aucun concert trouvé</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Essaie d&apos;autres mots-clés ou retire un filtre.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {concerts.map((c) => (
              <ConcertCard key={c._id} concert={c} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={(p) => setParams({ page: p }, false)}
          />
        </>
      )}
    </section>
  );
}
