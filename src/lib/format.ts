export function formatPrice(value: number) {
  // 15000 -> "15 000 FCFA"
  return `${new Intl.NumberFormat("fr-FR").format(value).replace(/\u202f|\u00a0/g, " ")} FCFA`;
}

export function formatDateShort(iso: string) {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", timeZone: "UTC" }).format(d),
    month: new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" })
      .format(d)
      .replace(".", "")
      .toUpperCase(),
  };
}

export function formatDateLong(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })
    .format(d)
    .replace(":", "h");
  return `${date} à ${time}`;
}

export function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000; // secondes (négatif = passé)
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

// "5 déc. 2026 · 20h00"
export function formatDateCompact(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })
    .format(d)
    .replace(":", "h");
  return `${date} · ${time}`;
}

// "2026-10-25" -> "25 oct."
export function formatDay(day: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}
