export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  const btn =
    "min-w-10 rounded-lg border border-outline-variant px-3 py-2 text-sm transition hover:bg-surface-container disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
      <button className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Précédent
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - pages[i - 1] > 1 && <span className="text-on-surface-variant">…</span>}
          <button
            className={`${btn} ${p === page ? "border-primary-container bg-primary-container text-on-primary hover:bg-primary-container" : ""}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        </span>
      ))}
      <button className={btn} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Suivant
      </button>
    </nav>
  );
}
