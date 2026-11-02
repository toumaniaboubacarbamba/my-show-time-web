import Image from "next/image";
import Link from "next/link";

export default function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Colonne visuelle */}
      <aside className="relative hidden overflow-hidden lg:block">
        <Image
          src="/images/auth-bg.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-background/30" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link
            href="/"
            className="w-fit rounded-full border border-outline-variant bg-surface-container-low/70 px-4 py-2 text-sm text-on-surface backdrop-blur hover:bg-surface-container"
          >
            ← Retour aux concerts
          </Link>

          <div>
            <div className="mb-6 flex items-center gap-3">
              <Image src="/logo.png" alt="" width={48} height={48} className="rounded-xl" />
              <div>
                <p className="font-sora text-2xl font-bold">My Show Time</p>
                <p className="text-[11px] uppercase tracking-widest text-primary">
                  Abidjan live experience
                </p>
              </div>
            </div>
            <h2 className="font-sora text-4xl font-bold leading-tight">
              L&apos;ambiance d&apos;Abidjan en direct.
            </h2>
            <p className="mt-4 max-w-md text-on-surface-variant">
              Réserve tes places pour les concerts du Palais de la Culture, du
              Stade FHB et des scènes d&apos;Abidjan, et retrouve tes billets
              avec leur QR code.
            </p>
          </div>
        </div>
      </aside>

      {/* Colonne formulaire */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="font-sora text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-on-surface-variant">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
