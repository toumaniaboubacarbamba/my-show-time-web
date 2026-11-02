import { Suspense } from "react";
import ConcertDetail from "@/components/concerts/ConcertDetail";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

type Params = Promise<{ id: string }>;

async function Content({ params }: { params: Params }) {
  const { id } = await params;
  return <ConcertDetail id={id} />;
}

export default function ConcertPage({ params }: { params: Params }) {
  return (
    <>
      <Header />
      <Suspense fallback={<div className="mx-auto h-72 max-w-6xl animate-pulse px-6" />}>
        <Content params={params} />
      </Suspense>
      <Footer />
    </>
  );
}
