import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import ThemeProvider from "@/components/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 relative pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0`}>
        <ThemeProvider>
          <Navbar />
          <main className="pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-[calc(4rem+env(safe-area-inset-top))]">
            {children}
          </main>
          <BottomNav />
          <div className="hidden md:block">
            <Footer />
          </div>
          <Toaster
            position="top-center"
            containerStyle={{ top: "calc(env(safe-area-inset-top, 0px) + 4rem)" }}
            toastOptions={{
              className: "!rounded-xl !shadow-lg !border !border-slate-200 dark:!border-slate-700 dark:!bg-slate-800 dark:!text-white",
              duration: 3000,
            }}
          />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
