import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "My Show Time",
  description: "La billetterie des concerts et festivals d'Abidjan",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${sora.variable} ${inter.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
