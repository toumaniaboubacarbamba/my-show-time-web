"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { formatDateCompact, formatDay, formatPrice } from "@/lib/format";
import type { AdminStats } from "@/lib/types";

const PERIODS = [7, 30, 90];
type Metric = "revenue" | "tickets";

const nf = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export default function DashboardView() {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<Metric>("revenue");
  // Le résultat est rangé avec la période qu'il concerne : tant qu'il ne
  // correspond pas à `days`, on affiche le squelette de chargement.
  const [result, setResult] = useState<{
    days: number;
    stats: AdminStats | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .stats(days)
      .then((stats) => !cancelled && setResult({ days, stats, error: null }))
      .catch((e) => !cancelled && setResult({ days, stats: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [days]);

  const current = result?.days === days ? result : null;
  const stats = current?.stats ?? null;
  const error = current?.error ?? null;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Administration</p>
          <h1 className="font-sora text-3xl font-bold">Tableau de bord</h1>
        </div>
        <div className="flex rounded-xl border border-outline-variant p-1 text-sm">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setDays(p)}
              className={`rounded-lg px-4 py-1.5 transition ${
                days === p ? "bg-primary-container font-semibold text-on-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {p} j
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-8 rounded-2xl border border-error/40 bg-error/10 p-6 text-error">
          {error}
        </p>
      ) : !stats ? (
        <div className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-container-low" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-surface-container-low" />
        </div>
      ) : (
        <Content stats={stats} metric={metric} setMetric={setMetric} days={days} />
      )}
    </div>
  );
}

function Content({
  stats,
  metric,
  setMetric,
  days,
}: {
  stats: AdminStats;
  metric: Metric;
  setMetric: (m: Metric) => void;
  days: number;
}) {
  const { summary, daily, topConcerts, byGenre } = stats;
  const max = Math.max(1, ...daily.map((d) => d[metric]));
  const maxGenre = Math.max(1, ...byGenre.map((g) => g.revenue));

  const kpis = [
    { label: "Revenus", value: formatPrice(summary.revenue), hint: "réservations confirmées" },
    { label: "Billets vendus", value: nf(summary.ticketsSold), hint: "toutes dates confondues" },
    { label: "Réservations", value: nf(summary.confirmedBookings), hint: "confirmées" },
    {
      label: "Annulations",
      value: `${summary.cancellationRate} %`,
      hint: `${nf(summary.cancelledBookings)} annulée${summary.cancelledBookings > 1 ? "s" : ""}`,
      warn: summary.cancellationRate >= 50,
    },
  ];

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-5">
            <p className="text-xs uppercase tracking-widest text-on-surface-variant">{k.label}</p>
            <p className={`mt-2 font-sora text-2xl font-bold ${k.warn ? "text-error" : ""}`}>{k.value}</p>
            <p className="mt-1 text-xs text-on-surface-variant">{k.hint}</p>
          </div>
        ))}
      </div>

      {/* Courbe quotidienne */}
      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sora text-lg font-bold">Activité sur {days} jours</h2>
          <div className="flex rounded-lg border border-outline-variant p-0.5 text-xs">
            {(["revenue", "tickets"] as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`rounded-md px-3 py-1 ${metric === m ? "bg-surface-container-highest font-semibold" : "text-on-surface-variant"}`}
              >
                {m === "revenue" ? "Revenus" : "Billets"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex h-48 items-end gap-0.75">
          {daily.map((d) => {
            const v = d[metric];
            const label = `${formatDay(d.date)} : ${metric === "revenue" ? formatPrice(v) : `${v} billet${v > 1 ? "s" : ""}`}`;
            return (
              <div key={d.date} title={label} className="flex h-full flex-1 items-end">
                <div
                  className={`w-full rounded-t ${v > 0 ? "bg-primary-container" : "bg-outline-variant/50"}`}
                  style={{ height: v > 0 ? `${Math.max((v / max) * 100, 3)}%` : "2px" }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-on-surface-variant">
          <span>{daily.length > 0 && formatDay(daily[0].date)}</span>
          <span>{daily.length > 0 && formatDay(daily[daily.length - 1].date)}</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Top concerts */}
        <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-6">
          <h2 className="font-sora text-lg font-bold">Concerts les plus réservés</h2>
          {topConcerts.length === 0 ? (
            <p className="mt-4 text-sm text-on-surface-variant">Pas encore de réservation.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Concert</th>
                    <th className="pb-3 pr-4 font-medium">Billets</th>
                    <th className="pb-3 pr-4 font-medium">Revenus</th>
                    <th className="pb-3 font-medium">Remplissage</th>
                  </tr>
                </thead>
                <tbody>
                  {topConcerts.map((c) => (
                    <tr key={c.concertId} className="border-t border-outline-variant/40">
                      <td className="py-3 pr-4">
                        <Link href={`/concerts/${c.concertId}`} className="font-semibold hover:text-primary">
                          {c.title}
                        </Link>
                        <p className="text-xs text-on-surface-variant">
                          {c.band} · {formatDateCompact(c.date)}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        {nf(c.tickets)}
                        <span className="text-xs text-on-surface-variant"> ({c.bookings} rés.)</span>
                      </td>
                      <td className="py-3 pr-4 font-semibold">{formatPrice(c.revenue)}</td>
                      <td className="py-3">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-container-highest">
                          <div className="h-full bg-primary-container" style={{ width: `${Math.min(100, c.fillRate)}%` }} />
                        </div>
                        <span className="text-xs text-on-surface-variant">{c.fillRate} %</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Par genre */}
        <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-6">
          <h2 className="font-sora text-lg font-bold">Revenus par genre</h2>
          {byGenre.length === 0 ? (
            <p className="mt-4 text-sm text-on-surface-variant">Aucune donnée.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {byGenre.map((g) => (
                <li key={g.genre}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{g.genre}</span>
                    <span className="text-on-surface-variant">{formatPrice(g.revenue)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-container-highest">
                    <div className="h-full rounded-full bg-secondary-container" style={{ width: `${(g.revenue / maxGenre) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">{nf(g.tickets)} billets</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
