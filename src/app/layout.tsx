import type { Metadata } from "next";
import { Noto_Sans_JP, Poppins } from "next/font/google";
import { AuthNudgeDialog } from "@/components/AuthNudgeDialog";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { SakuraBackground } from "@/components/SakuraBackground";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-primary",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true
});

const noto = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-accent",
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true
});

export const metadata: Metadata = {
  title: "RaketGo",
  description: "RaketGo migrated to Next.js + React + TypeScript"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();

  return (
    <html lang="en">
      <body className={`${poppins.variable} ${noto.variable}`}>
        <SakuraBackground />
        <AuthNudgeDialog isAuthenticated={Boolean(session)} />
        <Navbar />
        <main className="container page-main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
