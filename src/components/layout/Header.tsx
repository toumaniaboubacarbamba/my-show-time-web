"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import NotificationBell from "./NotificationBell";

export default function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" />
          <span className="font-sora text-lg font-bold">My Show Time</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-on-surface-variant md:flex">
          <Link href="/" className="hover:text-on-surface">Concerts</Link>
          {user && (
            <>
              <Link href="/reservations" className="hover:text-on-surface">Mes réservations</Link>
              <Link href="/favoris" className="hover:text-on-surface">Mes favoris</Link>
            </>
          )}
          {user?.role === "admin" && (
            <Link href="/admin" className="hover:text-on-surface">Admin</Link>
          )}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {loading ? null : user ? (
            <>
              <NotificationBell />
              <Link
                href="/profil"
                className="hidden max-w-40 truncate text-on-surface-variant hover:text-on-surface sm:inline"
                title="Mon profil"
              >
                {user.email}
              </Link>
              <button
                onClick={logout}
                className="rounded-lg border border-outline-variant px-3 py-2 hover:bg-surface-container"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 hover:text-primary">Connexion</Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary-container px-4 py-2 font-semibold text-on-primary hover:brightness-110"
              >
                S&apos;inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
