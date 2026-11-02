"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/concerts/Pagination";
import { adminApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateCompact } from "@/lib/format";
import type { AdminUser, Role } from "@/lib/types";
import UserFormModal from "./UserFormModal";

const LIMIT = 10;

export default function AdminUsers() {
  const { user: me, refresh } = useAuth();

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [page, setPage] = useState(1);

  const [reload, setReload] = useState(0); // incrémenté pour relancer le chargement
  const [result, setResult] = useState<{
    key: string;
    items: AdminUser[];
    total: number;
    error: string | null;
  } | null>(null);

  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const key = `${query}|${role}|${page}|${reload}`;

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listUsers({ search: query, role, page, limit: LIMIT })
      .then((res) => !cancelled && setResult({ key, items: res.items, total: res.total, error: null }))
      .catch((e) => !cancelled && setResult({ key, items: [], total: 0, error: e.message ?? "Chargement impossible." }));
    return () => {
      cancelled = true;
    };
  }, [key, query, role, page]);

  const loading = result?.key !== key;
  const users = result?.items ?? [];
  const total = result?.total ?? 0;
  const error = loading ? null : (result?.error ?? null);

  async function changeRole(u: AdminUser, next: Role) {
    if (next === u.role) return;
    setBusyId(u._id);
    setActionError(null);
    try {
      await adminApi.setUserRole(u._id, next);
      setResult((r) =>
        r ? { ...r, items: r.items.map((x) => (x._id === u._id ? { ...x, role: next } : x)) } : r,
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Changement de rôle impossible.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await adminApi.removeUser(id);
      setDeletingId(null);
      if (users.length === 1 && page > 1) setPage(page - 1);
      else setReload((r) => r + 1);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const field =
    "rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/30";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Administration</p>
          <h1 className="font-sora text-3xl font-bold">Gestion des utilisateurs</h1>
          {!loading && !error && (
            <p className="mt-1 text-sm text-on-surface-variant">
              {total} utilisateur{total > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => setEditing("new")}
          className="rounded-xl bg-primary-container px-5 py-2.5 font-semibold text-on-primary shadow-lg shadow-primary-container/20 hover:brightness-110"
        >
          + Nouvel utilisateur
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par email…"
          className={`${field} w-full max-w-sm`}
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | "");
            setPage(1);
          }}
          className={field}
        >
          <option value="">Tous les rôles</option>
          <option value="user">Utilisateurs</option>
          <option value="admin">Administrateurs</option>
        </select>
      </div>

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
              <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-container" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="p-12 text-center text-on-surface-variant">Aucun utilisateur trouvé.</p>
        ) : (
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-5 py-4 font-medium">Email</th>
                <th className="px-3 py-4 font-medium">Rôle</th>
                <th className="px-3 py-4 font-medium">Inscrit le</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u._id === me?.id;
                return (
                  <tr key={u._id} className="border-t border-outline-variant/40">
                    <td className="px-5 py-4">
                      <span className="font-medium">{u.email}</span>
                      {isMe && (
                        <span className="ml-2 rounded-full bg-primary-container/20 px-2 py-0.5 text-[11px] text-primary">
                          Toi
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <select
                        value={u.role}
                        disabled={isMe || busyId === u._id}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        title={isMe ? "Tu ne peux pas modifier ton propre rôle" : undefined}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                          u.role === "admin"
                            ? "border-secondary/50 bg-secondary-container/20 text-secondary"
                            : "border-outline-variant bg-surface-container-lowest"
                        }`}
                      >
                        <option value="user">Utilisateur</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-on-surface-variant">
                      {formatDateCompact(u.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {deletingId === u._id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-on-surface-variant">Supprimer ?</span>
                          <button
                            onClick={() => confirmDelete(u._id)}
                            disabled={busyId === u._id}
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
                          <button onClick={() => setEditing(u)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs hover:bg-surface-container">
                            Modifier
                          </button>
                          {!isMe && (
                            <button
                              onClick={() => {
                                setActionError(null);
                                setDeletingId(u._id);
                              }}
                              className="rounded-lg border border-error/50 px-3 py-1.5 text-xs text-error hover:bg-error/10"
                            >
                              Supprimer
                            </button>
                          )}
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
        <UserFormModal
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(savedId) => {
            setEditing(null);
            if (savedId && savedId === me?.id) refresh(); // on a modifié son propre compte
            setReload((r) => r + 1);
          }}
        />
      )}
    </div>
  );
}
