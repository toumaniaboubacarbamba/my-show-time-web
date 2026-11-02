"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { AdminUser, Role } from "@/lib/types";

const input =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/30";

export default function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser | null; // null = création
  onClose: () => void;
  onSaved: (savedId: string | null) => void;
}) {
  const editing = Boolean(user);
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
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

    if (password && password.length < 8) {
      return setError("Le mot de passe doit contenir au moins 8 caractères.");
    }

    setSubmitting(true);
    try {
      if (user) {
        const changes = {
          ...(email.trim() !== user.email ? { email: email.trim() } : {}),
          ...(password ? { password } : {}),
        };
        if (Object.keys(changes).length === 0) {
          setError("Aucune modification à enregistrer.");
          return;
        }
        await adminApi.updateUser(user._id, changes);
        onSaved(user._id);
      } else {
        await adminApi.createUser({ email: email.trim(), password, role });
        onSaved(null);
      }
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
        className="w-full max-w-md space-y-4 rounded-2xl border border-outline-variant bg-surface-container p-6"
      >
        <h2 className="font-sora text-xl font-bold">
          {editing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
        </h2>

        {error && (
          <p role="alert" className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Adresse email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            {editing ? "Nouveau mot de passe" : "Mot de passe"}
            <span className="text-on-surface-variant">
              {editing ? " (laisse vide pour le garder)" : " (8 caractères min.)"}
            </span>
          </span>
          <input
            type="password"
            required={!editing}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>

        {!editing && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Rôle</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={input}>
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </label>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-outline-variant px-5 py-2.5 text-sm hover:bg-surface-container-high">
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-primary-container px-5 py-2.5 text-sm font-semibold text-on-primary hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
