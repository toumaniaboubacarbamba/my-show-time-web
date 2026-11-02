import { Suspense } from "react";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ConcertBrowser from "@/components/concerts/ConcertBrowser";

export default function HomePage() {
  return (
    <>
      <Header />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-175 -translate-x-1/2 rounded-full bg-primary-container/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pt-28">
          <p className="mb-4 inline-block rounded-full border border-outline-variant bg-surface-container-low px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            Billetterie officielle · Abidjan
          </p>
          <h1 className="font-sora text-5xl font-bold leading-tight sm:text-6xl">
            Ce soir, Abidjan <span className="text-primary-container">vibre.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-on-surface-variant">
            Trouve ton concert, réserve tes places en quelques clics et présente
            ton QR code à l&apos;entrée.
          </p>
          <a
            href="#programme"
            className="mt-8 inline-block rounded-xl bg-primary-container px-6 py-3 font-sora font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition hover:brightness-110"
          >
            Voir la programmation
          </a>
        </div>
      </section>

      <Suspense fallback={null}>
        <ConcertBrowser />
      </Suspense>

      <Footer />
    </>
  );
}
