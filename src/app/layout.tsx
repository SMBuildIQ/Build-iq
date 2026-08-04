import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildIQ — Residential Construction Estimating",
  description:
    "Upload blueprints, AI takeoffs, cost estimates, subcontractor bid packages, Excel export, and ECI Spruce sync.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
