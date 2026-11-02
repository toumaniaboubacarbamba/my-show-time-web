"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notificationsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { timeAgo } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

function concertId(c: AppNotification["concert"]) {
  if (!c) return null;
  return typeof c === "string" ? c : c._id;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    notificationsApi.mine().then(setItems).catch(() => {});
  }, []);

  // Chargement + rafraîchissement toutes les minutes
  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [user, load]);

  // Fermer en cliquant à l'extérieur
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Déconnecté : on n'affiche rien, sans avoir à vider l'état dans un effet
  const list = useMemo(() => (user ? items : []), [user, items]);
  const sorted = useMemo(
    () => [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [list],
  );
  const unread = list.filter((n) => !n.read).length;

  function openItem(n: AppNotification) {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      notificationsApi.markRead(n._id).catch(load);
    }
    const id = concertId(n.concert);
    if (id) {
      setOpen(false);
      router.push(`/concerts/${id}`);
    }
  }

  function readAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    notificationsApi.readAll().catch(load);
  }

  if (!user) return null;

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}
        className="relative rounded-lg border border-outline-variant p-2 hover:bg-surface-container"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-container px-1 text-[11px] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container shadow-2xl">
          <div className="flex items-center justify-between border-b border-outline-variant/60 px-4 py-3">
            <p className="font-sora font-semibold">Notifications</p>
            {unread > 0 && (
              <button onClick={readAll} className="text-xs text-primary hover:underline">
                Tout marquer comme lu
              </button>
            )}
          </div>

          <ul className="max-h-96 overflow-y-auto">
            {sorted.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-on-surface-variant">
                Aucune notification pour l&apos;instant.
              </li>
            ) : (
              sorted.slice(0, 8).map((n) => (
                <li key={n._id}>
                  <button
                    onClick={() => openItem(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left text-sm transition hover:bg-surface-container-high ${
                      n.read ? "text-on-surface-variant" : ""
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        n.read ? "bg-transparent" : "bg-primary-container"
                      }`}
                    />
                    <span>
                      <span className="block first-letter:uppercase">{n.message}</span>
                      <span className="mt-0.5 block text-xs text-on-surface-variant">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
