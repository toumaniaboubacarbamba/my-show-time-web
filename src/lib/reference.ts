const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Extrait la référence d'un billet à partir de ce que le staff saisit ou scanne :
 * - une référence seule : 72c77cc1-0fc8-4215-99b7-afe4262afaa4
 * - un lien contenant la référence : http://.../billet/72c77cc1-...
 * - n'importe quel texte contenant un UUID
 */
export function extractReference(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  const uuid = text.match(UUID);
  if (uuid) return uuid[0].toLowerCase();

  // Pas d'UUID : si c'est un lien, on prend le dernier segment du chemin
  try {
    const last = new URL(text).pathname.split("/").filter(Boolean).pop();
    if (last) return decodeURIComponent(last);
  } catch {
    /* ce n'est pas un lien */
  }
  return text.includes(" ") ? null : text;
}
