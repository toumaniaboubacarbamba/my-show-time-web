"use client";

import { useEffect, useState } from "react";
import { bookingsApi } from "@/lib/api";

export default function QrCode({
  bookingId,
  reference,
}: {
  bookingId: string;
  reference: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    bookingsApi
      .qrCodeUrl(bookingId)
      .then((u) => {
        if (cancelled) return URL.revokeObjectURL(u);
        objectUrl = u;
        setUrl(u);
      })
      .catch((e) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bookingId]);

  if (error) return <p className="text-sm text-error">{error}</p>;
  if (!url) return <div className="h-48 w-48 animate-pulse rounded-xl bg-surface-container-highest" />;

  return (
    <div className="flex flex-col items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`QR code du billet ${reference}`} className="h-48 w-48 rounded-xl bg-white p-2" />
      <a
        href={url}
        download={`billet-${reference.slice(0, 8)}.png`}
        className="text-sm text-primary hover:underline"
      >
        Télécharger le QR code
      </a>
    </div>
  );
}
