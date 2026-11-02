"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { useAuth } from "@/lib/auth-context";
import { safeNext } from "@/lib/redirect";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.push(safeNext() ?? (user.role === "admin" ? "/admin" : "/"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Bon retour parmi nous !"
      subtitle="Connecte-toi pour retrouver tes billets et tes groupes favoris."
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
            placeholder="toi@exemple.ci"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/30"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Mot de passe</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 pr-20 outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 text-sm text-on-surface-variant hover:text-on-surface"
            >
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary-container py-3 font-sora font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Connexion en cours…" : "Se connecter"}
        </button>

        <p className="text-center text-sm text-on-surface-variant">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
