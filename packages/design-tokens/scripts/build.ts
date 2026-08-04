import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { cssVariables } from "../src/index.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });

writeFileSync(join(dist, "tokens.css"), cssVariables("light") + "\n" + cssVariables("dark"));
copyFileSync(join(root, "tokens.json"), join(dist, "tokens.json"));

await build({
  entryPoints: [join(root, "src/index.ts")],
  outfile: join(dist, "index.js"),
  bundle: true,
  platform: "neutral",
  format: "esm",
  packages: "external",
});

await build({
  entryPoints: [join(root, "src/index.ts")],
  outfile: join(dist, "index.cjs"),
  bundle: true,
  platform: "neutral",
  format: "cjs",
  packages: "external",
});

writeFileSync(
  join(dist, "index.d.ts"),
  `export type ColorMode = "light" | "dark";
export declare const tokens: typeof import("../tokens.json");
export declare function colors(mode?: ColorMode): Record<string, string>;
export declare function nativeTheme(mode?: ColorMode): {
  mode: ColorMode;
  colors: Record<string, string>;
  space: Record<string, number>;
  radius: { none: number; full: number };
  stroke: { hairline: number; cta: number };
  motion: Record<string, unknown>;
  layout: Record<string, number>;
  typography: Record<string, unknown>;
};
export type NativeTheme = ReturnType<typeof nativeTheme>;
export declare function cssVariables(mode?: ColorMode): string;
export type HeroTone =
  | "jobs"
  | "jobDetail"
  | "proposals"
  | "proposalDetail"
  | "shop"
  | "cart"
  | "track"
  | "orders"
  | "account"
  | "cabinetry"
  | "settings"
  | "login";
export declare const HERO_PHOTOS: Record<HeroTone, { uri: string; alt: string }>;
export declare function heroPhoto(tone?: HeroTone): { uri: string; alt: string };
`
);

console.log("design-tokens build ok");
