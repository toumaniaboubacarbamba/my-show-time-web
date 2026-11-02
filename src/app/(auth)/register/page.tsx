"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { useAuth } from "@/lib/auth-context";
import { safeNext } from "@/lib/redirect";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password);
      router.push(safeNext() ?? "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/30";

  return (
    <AuthShell
      title="Rejoins la scène"
      subtitle="Crée ton compte pour réserver tes places en quelques clics."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error"
          >
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Adresse email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">
            Mot de passe <span className="text-on-surface-variant">(8 caractères min.)</span>
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Confirmer le mot de passe</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={input}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary-container py-3 font-sora font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Création du compte…" : "Créer mon compte"}
        </button>

        <p className="text-center text-sm text-on-surface-variant">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
