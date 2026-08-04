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
    "BuildIQ by Supply Monkey Lumber & Materials Co — residential estimating, takeoffs, and material packages for builders in Prescott, AZ.",
  applicationName: "BuildIQ",
  authors: [{ name: "Supply Monkey Lumber & Materials Co" }],
  keywords: ["Supply Monkey", "construction", "estimating", "takeoff", "lumber", "Prescott"],
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
  themeColor: "#1a1b1f",
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
        <link rel="icon" href="/brand/favicon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
