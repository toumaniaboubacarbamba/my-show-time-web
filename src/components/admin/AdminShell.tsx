"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/admin", label: "Tableau de bord", exact: true },
  { href: "/admin/concerts", label: "Concerts" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/controle", label: "Contrôle des billets" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/admin");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="mx-auto h-screen max-w-6xl animate-pulse px-6 py-10" />;
  }

  if (user.role !== "admin") {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="font-sora text-3xl font-bold">Accès réservé</h1>
        <p className="mt-2 text-on-surface-variant">
          Cette zone est réservée aux administrateurs de My Show Time.
        </p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-primary-container px-6 py-3 font-semibold text-on-primary">
          Retour au site
        </Link>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-outline-variant/60 bg-surface-container-lowest md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-4 px-5 py-4 md:flex-col md:items-stretch md:gap-8 md:py-6">
          <Link href="/admin" className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" />
            <div>
              <p className="font-sora font-bold leading-tight">My Show Time</p>
              <p className="text-xs text-on-surface-variant">Back-office</p>
            </div>
          </Link>

          <nav className="flex gap-1 md:flex-col">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-4 py-2.5 text-sm transition ${
                    active
                      ? "bg-surface-container-high font-semibold text-primary"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden px-5 pb-6 md:absolute md:bottom-0 md:block md:w-64">
          <Link href="/" className="mb-3 block text-sm text-on-surface-variant hover:text-on-surface">
            ← Retour au site
          </Link>
          <div className="rounded-xl border border-outline-variant/60 p-3">
            <p className="truncate text-sm font-medium">{user.email}</p>
            <button onClick={logout} className="mt-1 text-xs text-primary hover:underline">
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 px-6 py-8 md:px-10">{children}</div>
    </div>
  );
}
