import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Manrope } from "next/font/google";
import { Providers } from "@/components/Providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Race Goal Forecaster",
  description:
    "Connect Strava and forecast whether you can hit your race finish time by race day.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        bricolage.variable,
        manrope.variable,
        plexMono.variable,
        "font-sans",
        "dark",
      )}
    >
      <body className={manrope.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
