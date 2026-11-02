import { Suspense } from "react";
import TicketVerification from "@/components/bookings/TicketVerification";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

type Params = Promise<{ reference: string }>;

async function Content({ params }: { params: Params }) {
  const { reference } = await params;
  return <TicketVerification reference={reference} />;
}

export default function TicketPage({ params }: { params: Params }) {
  return (
    <>
      <Header />
      <Suspense fallback={<div className="mx-auto h-80 max-w-lg animate-pulse px-6" />}>
        <Content params={params} />
      </Suspense>
      <Footer />
    </>
  );
}
