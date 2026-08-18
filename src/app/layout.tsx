import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildIQ Purchasing",
  description: "AI-powered B2B purchasing platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
