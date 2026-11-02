"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { User } from "@/lib/types";

const input =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/30";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/profil");
  }, [loading, user, router]);

  if (loading || !user) return <div className="mx-auto h-64 max-w-xl animate-pulse px-6" />;
  return <Form user={user} />;
}

function Form({ user }: { user: User }) {
  const { refresh } = useAuth();

  const [email, setEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const emailChanged = email.trim() !== user.email;
    const passwordChanged = newPassword.length > 0;

    if (!emailChanged && !passwordChanged) {
      setError("Aucune modification à enregistrer.");
      return;
    }
    if (passwordChanged && newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (passwordChanged && newPassword !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      await usersApi.updateMe({
        currentPassword,
        ...(emailChanged ? { email: email.trim() } : {}),
        ...(passwordChanged ? { newPassword } : {}),
      });
      setSuccess("Profil mis à jour.");
      setNewPassword("");
      setConfirm("");
      setCurrentPassword("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Mon espace</p>
      <h1 className="font-sora text-3xl font-bold">Mon profil</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Rôle : <span className="font-semibold text-on-surface">{user.role === "admin" ? "Administrateur" : "Utilisateur"}</span>
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-6">
        {error && (
          <p role="alert" className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="rounded-xl border border-tertiary/40 bg-tertiary/10 px-4 py-3 text-sm text-tertiary">
            {success}
          </p>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Adresse email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">
            Nouveau mot de passe <span className="text-on-surface-variant">(laisse vide pour le garder)</span>
          </span>
          <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={input} />
        </label>

        {newPassword && (
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Confirmer le nouveau mot de passe</span>
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
          </label>
        )}

        <div className="border-t border-dashed border-outline-variant pt-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Mot de passe actuel</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={input}
            />
            <span className="mt-1 block text-xs text-on-surface-variant">
              Obligatoire pour confirmer toute modification.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary-container py-3 font-sora font-semibold text-on-primary transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </main>
  );
}
