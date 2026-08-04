import tokensJson from "../tokens.json";

export type ColorMode = "light" | "dark";

export const tokens = tokensJson;

export function colors(mode: ColorMode = "light") {
  return tokens.color[mode];
}

/** Expo / RN theme object */
export function nativeTheme(mode: ColorMode = "light") {
  const c = colors(mode);
  return {
    mode,
    colors: {
      canvas: c["bg.canvas"],
      surface: c["bg.surface"],
      surfaceMuted: c["bg.surfaceMuted"],
      inverse: c["bg.inverse"],
      inverseLift: c["bg.inverseLift"],
      text: c["text.primary"],
      textSecondary: c["text.secondary"],
      textMuted: c["text.muted"],
      textInverse: c["text.inverse"],
      accent: c["accent.primary"],
      accentPressed: c["accent.primaryPressed"],
      brand: c["accent.brand"],
      brandInk: c["accent.brandInk"],
      border: c["border.subtle"],
      borderStrong: c["border.strong"],
      focus: c["border.focus"],
      draft: c["status.draft"],
      progress: c["status.progress"],
      success: c["status.success"],
      danger: c["status.danger"],
      scrim: c["overlay.scrim"],
    },
    space: tokens.space,
    radius: tokens.radius,
    stroke: tokens.stroke,
    motion: tokens.motion,
    layout: tokens.layout,
    typography: tokens.typography,
  };
}

export type NativeTheme = ReturnType<typeof nativeTheme>;

export function cssVariables(mode: ColorMode = "light") {
  const c = colors(mode);
  const lines = Object.entries(c).map(([k, v]) => `  --bq-${k.replace(/\./g, "-")}: ${v};`);
  for (const [k, v] of Object.entries(tokens.space)) {
    lines.push(`  --bq-space-${k}: ${v}px;`);
  }
  lines.push(`  --bq-radius-none: ${tokens.radius.none}px;`);
  lines.push(`  --bq-motion-fast: ${tokens.motion.fast}ms;`);
  lines.push(`  --bq-motion-base: ${tokens.motion.base}ms;`);
  lines.push(`  --bq-motion-enter: ${tokens.motion.enter}ms;`);
  lines.push(`  --bq-motion-ease: ${tokens.motion.easing};`);
  return `:root, [data-theme="${mode}"] {\n${lines.join("\n")}\n}\n`;
}
