import Image from "next/image";
import Link from "next/link";
import type { Concert } from "@/lib/types";
import { formatDateShort, formatPrice } from "@/lib/format";

export function pickImage(genre: string) {
  const sum = [...genre].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `/images/concerts/${(sum % 3) + 1}.jpg`;
}

export default function ConcertCard({ concert }: { concert: Concert }) {
  const { day, month } = formatDateShort(concert.date);
  const sold = concert.totalSeats - concert.availableSeats;
  const fill = Math.min(100, Math.round((sold / concert.totalSeats) * 100));
  const soldOut = concert.availableSeats <= 0;
  const almostFull = !soldOut && concert.availableSeats / concert.totalSeats <= 0.1;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-low transition hover:-translate-y-1 hover:border-primary-container/60">
      <div className="relative h-44 overflow-hidden">
        <Image
          src={pickImage(concert.genre)}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-surface-container-low via-transparent" />

        <div className="absolute left-3 top-3 rounded-lg bg-background/80 px-3 py-1.5 text-center backdrop-blur">
          <p className="font-sora text-lg font-bold leading-none">{day}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{month}</p>
        </div>

        <span className="absolute right-3 top-3 rounded-full bg-secondary-container/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide capitalize backdrop-blur">
          {concert.genre}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-sora text-lg font-bold leading-snug">{concert.title}</h3>
        <p className="mt-1 text-sm text-primary">{concert.band}</p>
        <p className="mt-1 text-sm text-on-surface-variant">{concert.venue}</p>

        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
            <div
              className={`h-full rounded-full ${soldOut ? "bg-error" : "bg-primary-container"}`}
              style={{ width: `${fill}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-on-surface-variant">
            {soldOut
              ? "Complet"
              : almostFull
                ? `Dernières places : ${concert.availableSeats}`
                : `${new Intl.NumberFormat("fr-FR").format(concert.availableSeats)} places restantes`}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between pt-5">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-on-surface-variant">Dès</p>
            <p className="font-sora font-bold text-primary-container">{formatPrice(concert.price)}</p>
          </div>
          <Link
            href={`/concerts/${concert._id}`}
            className="rounded-xl bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary transition hover:brightness-110"
          >
            {soldOut ? "Voir" : "Réserver"}
          </Link>
        </div>
      </div>
    </article>
  );
}
