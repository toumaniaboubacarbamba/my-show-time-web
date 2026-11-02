/**
 * Lit ?next=/chemin dans l'URL (à appeler côté client, dans un gestionnaire d'événement).
 * N'accepte que les chemins internes pour éviter les redirections vers un autre site.
 */
export function safeNext(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return null;
}
