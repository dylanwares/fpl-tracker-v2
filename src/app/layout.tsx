import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FPL Tracker",
  description: "Midweek planning aid for Fantasy Premier League",
  applicationName: "FPL Tracker",
  // Installed to the home screen, iOS runs this without browser chrome.
  appleWebApp: {
    capable: true,
    title: "FPL",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.png",
    // iOS uses this for the home screen icon.
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0e",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Native apps don't pinch-zoom, and an accidental zoom in a dense stats table
  // is a constant annoyance. Drop these two lines to put zoom back.
  maximumScale: 1,
  userScalable: false,
  // Let content run under the notch and home indicator; safe-area insets in the
  // app bar and tab bar keep it clear of them.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
