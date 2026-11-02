"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/concerts/Pagination";
import { concertsApi } from "@/lib/api";
import { formatDateCompact, formatPrice } from "@/lib/format";
import type { Concert } from "@/lib/types";
import ConcertFormModal from "./ConcertFormModal";

const LIMIT = 10;
const nf = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export default function AdminConcerts() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0); // incrémenté pour relancer le chargement
  const [result, setResult] = useState<{
    key: string;
    items: Concert[];
    total: number;
    error: string | null;
  } | null>(null);

  // null = fermé, "new" = création, Concert = édition
  const [editing, setEditing] = useState<Concert | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Recherche avec délai
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const key = `${query}|${page}|${reload}`;

  useEffect(() => {
    let cancelled = false;
    concertsApi
      .list({ search: query, page, limit: LIMIT })
      .then((res) => !cancelled && setResult({ key, items: res.items, total: res.total, error: null }))
      .catch((e) => !cancelled && setResult({ key, items: [], total: 0, error: e.message ?? "Chargement impossible." }));
    return () => {
      cancelled = true;
    };
  }, [key, query, page]);

  const loading = result?.key !== key;
  const concerts = result?.items ?? [];
  const total = result?.total ?? 0;
  const error = loading ? null : (result?.error ?? null);

  async function confirmDelete(id: string) {
    setBusy(true);
    setActionError(null);
    try {
      await concertsApi.remove(id);
      setDeletingId(null);
      // si on supprime le dernier élément de la page, on recule d'une page
      if (concerts.length === 1 && page > 1) setPage(page - 1);
      else setReload((r) => r + 1);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Administration</p>
          <h1 className="font-sora text-3xl font-bold">Gestion des concerts</h1>
          {!loading && <p className="mt-1 text-sm text-on-surface-variant">{total} concert{total > 1 ? "s" : ""}</p>}
        </div>
        <button
          onClick={() => setEditing("new")}
          className="rounded-xl bg-primary-container px-5 py-2.5 font-semibold text-on-primary shadow-lg shadow-primary-container/20 hover:brightness-110"
        >
          + Nouveau concert
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par titre, groupe ou lieu…"
        className="mt-6 w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/30"
      />

      {actionError && (
        <p role="alert" className="mt-4 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {actionError}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-outline-variant/60 bg-surface-container-low">
        {error ? (
          <p role="alert" className="p-6 text-error">{error}</p>
        ) : loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-container" />
            ))}
          </div>
        ) : concerts.length === 0 ? (
          <p className="p-12 text-center text-on-surface-variant">Aucun concert trouvé.</p>
        ) : (
          <table className="w-full min-w-205 text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-5 py-4 font-medium">Concert</th>
                <th className="px-3 py-4 font-medium">Date</th>
                <th className="px-3 py-4 font-medium">Lieu</th>
                <th className="px-3 py-4 font-medium">Places</th>
                <th className="px-3 py-4 font-medium">Prix</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {concerts.map((c) => {
                const fill = Math.round(((c.totalSeats - c.availableSeats) / c.totalSeats) * 100);
                return (
                  <tr key={c._id} className="border-t border-outline-variant/40">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-xs text-on-surface-variant">
                        {c.band} · <span className="capitalize">{c.genre}</span>
                      </p>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">{formatDateCompact(c.date)}</td>
                    <td className="px-3 py-4">{c.venue}</td>
                    <td className="px-3 py-4">
                      <p className="whitespace-nowrap">{nf(c.availableSeats)} / {nf(c.totalSeats)}</p>
                      <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-surface-container-highest">
                        <div className="h-full bg-primary-container" style={{ width: `${fill}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap font-semibold">{formatPrice(c.price)}</td>
                    <td className="px-5 py-4 text-right">
                      {deletingId === c._id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-on-surface-variant">Supprimer ?</span>
                          <button
                            onClick={() => confirmDelete(c._id)}
                            disabled={busy}
                            className="rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-background disabled:opacity-60"
                          >
                            Oui
                          </button>
                          <button onClick={() => setDeletingId(null)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs">
                            Non
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex gap-2">
                          <button onClick={() => setEditing(c)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs hover:bg-surface-container">
                            Modifier
                          </button>
                          <button
                            onClick={() => {
                              setActionError(null);
                              setDeletingId(c._id);
                            }}
                            className="rounded-lg border border-error/50 px-3 py-1.5 text-xs text-error hover:bg-error/10"
                          >
                            Supprimer
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {editing && (
        <ConcertFormModal
          concert={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setReload((r) => r + 1);
          }}
        />
      )}
    </div>
  );
}
