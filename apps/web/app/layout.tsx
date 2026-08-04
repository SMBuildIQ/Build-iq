import type { Metadata } from "next";
import { Questrial, Staatliches } from "next/font/google";
import { cssVariables } from "@buildiq/design-tokens";
import "./globals.css";

const staatliches = Staatliches({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-staatliches",
  display: "swap",
});

const questrial = Questrial({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-questrial",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BuildIQ",
    template: "%s · BuildIQ",
  },
  description: "Luxury jobsite estimates, proposals, and millwork for builders — Supply Monkey.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const tokenCss = cssVariables("light") + "\n" + cssVariables("dark");

  return (
    <html lang="en" data-theme="light" className={`${staatliches.variable} ${questrial.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: tokenCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
