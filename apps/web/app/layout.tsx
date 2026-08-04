import type { Metadata } from "next";
import { Questrial, Staatliches } from "next/font/google";
import { cssVariables } from "@buildiq/design-tokens";
import { ThemeProvider, THEME_BOOT_SCRIPT } from "@/components/ThemeProvider";
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
  // Light vars on :root + [data-theme=light]; dark only when data-theme=dark (avoid :root clash).
  const lightCss = cssVariables("light");
  const darkCss = cssVariables("dark").replace(
    ':root, [data-theme="dark"]',
    '[data-theme="dark"]',
  );
  const tokenCss = `${lightCss}\n${darkCss}`;

  return (
    <html lang="en" data-theme="light" className={`${staatliches.variable} ${questrial.variable}`} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: tokenCss }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
