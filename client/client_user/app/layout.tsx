import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SafeStreets - Building Safer Communities",
  description: "A community-driven platform for reporting and tracking safety incidents.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SafeStreets",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 relative pb-20 md:pb-0`}>
        <Navbar />
        <main className="pt-[calc(4rem+env(safe-area-inset-top))]">
          {children}
        </main>
        <BottomNav />
        <div className="hidden md:block">
          <Footer />
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
