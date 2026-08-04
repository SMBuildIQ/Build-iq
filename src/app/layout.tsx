import type { Metadata, Viewport } from "next";
import "./globals.css";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SkipToContent } from "@/components/a11y/SkipToContent";

export const metadata: Metadata = {
  title: {
    default: "BuildIQ",
    template: "%s · BuildIQ",
  },
  description:
    "Residential construction estimating app for builders — plan upload, AI takeoff bots, bids, material packages, Apple Pay & Google Pay.",
  applicationName: "BuildIQ",
  authors: [{ name: "BuildIQ" }],
  keywords: ["construction", "estimating", "takeoff", "builders", "Spruce"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BuildIQ",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#14201b",
  width: "device-width",
  initialScale: 1,
  // Do not lock maximumScale — required for accessibility / store guidelines
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased overscroll-none">
        <SkipToContent />
        <ErrorBoundary>
          {children}
          <InstallPrompt />
        </ErrorBoundary>
      </body>
    </html>
  );
}
