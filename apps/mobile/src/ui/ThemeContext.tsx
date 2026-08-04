import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, Appearance, useColorScheme, useWindowDimensions } from "react-native";
import { nativeTheme, type ColorMode, type NativeTheme } from "@buildiq/design-tokens";

export type ThemePreference = "system" | ColorMode;

export type AppTheme = NativeTheme & {
  colors: NativeTheme["colors"] & {
    canvas: string;
    surface: string;
    surfaceMuted: string;
    inverse: string;
    inverseLift: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;
    accent: string;
    accentPressed: string;
    brand: string;
    brandInk: string;
    border: string;
    borderStrong: string;
    focus: string;
    draft: string;
    progress: string;
    success: string;
    danger: string;
    scrim: string;
  };
  space: Record<string, number> & {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    7: number;
    8: number;
    9: number;
    10: number;
  };
  layout: {
    gutterPhone: number;
    gutterTablet: number;
    gutterWeb: number;
    maxWidthWeb: number;
    heroMinHeight: number;
    buttonHeight: number;
    inputHeight: number;
    listRowMinHeight: number;
    tabBarHeight: number;
  };
  motion: {
    fast: number;
    base: number;
    enter: number;
    easing: string;
    spring: { stiffness: number; damping: number };
  };
};

type ThemeContextValue = {
  theme: AppTheme;
  mode: ColorMode;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  toggleMode: () => void;
  reduceMotion: boolean;
  isTablet: boolean;
  gutter: number;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function asAppTheme(mode: ColorMode): AppTheme {
  return nativeTheme(mode) as AppTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [reduceMotion, setReduceMotion] = useState(false);
  const { width } = useWindowDimensions();

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  const mode: ColorMode =
    preference === "system" ? (system === "dark" ? "dark" : "light") : preference;

  const theme = useMemo(() => asAppTheme(mode), [mode]);
  const isTablet = width >= 768;
  const gutter = isTablet ? theme.layout.gutterTablet : theme.layout.gutterPhone;

  const toggleMode = useCallback(() => {
    setPreference((prev) => {
      const current =
        prev === "system"
          ? Appearance.getColorScheme() === "dark"
            ? "dark"
            : "light"
          : prev;
      return current === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      mode,
      preference,
      setPreference,
      toggleMode,
      reduceMotion,
      isTablet,
      gutter,
    }),
    [theme, mode, preference, toggleMode, reduceMotion, isTablet, gutter]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function useFontsReady() {
  return {
    display: "Staatliches",
    body: "Questrial",
    hand: "Questrial",
    label: "Questrial",
    price: "Staatliches",
  } as const;
}
