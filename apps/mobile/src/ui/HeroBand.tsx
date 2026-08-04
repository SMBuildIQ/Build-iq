import React, { type ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "./ThemeContext";

/** Warm lumber stack — desaturated yard photo for Millwork Studio heroes. */
export const HERO_LUMBER_URI =
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=60";

type HeroBandProps = {
  eyebrow: string;
  title: string;
  supporting?: string;
  action?: ReactNode;
  /** Full-bleed photo behind scrim. Defaults on. */
  showPhoto?: boolean;
  imageUri?: string;
  style?: StyleProp<ViewStyle>;
};

/** Dark hero band with optional lumber photo, scrim, and orange 3px rule. */
export function HeroBand({
  eyebrow,
  title,
  supporting,
  action,
  showPhoto = true,
  imageUri = HERO_LUMBER_URI,
  style,
}: HeroBandProps) {
  const { theme, gutter } = useTheme();
  const base = theme.mode === "dark" ? theme.colors.inverseLift : "#161412";

  return (
    <View
      style={[
        {
          minHeight: theme.layout.heroMinHeight,
          backgroundColor: base,
          borderBottomWidth: 3,
          borderBottomColor: theme.colors.accent,
          overflow: "hidden",
          justifyContent: "flex-end",
        },
        style,
      ]}
      accessibilityRole="header"
    >
      {showPhoto ? (
        <Image
          source={{ uri: imageUri }}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          contentFit="cover"
          transition={theme.motion.enter as number}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: "rgba(22,20,18,0.72)",
        }}
      />
      <View
        style={{
          paddingHorizontal: gutter,
          paddingTop: theme.space[6],
          paddingBottom: theme.space[6],
          gap: theme.space[3],
        }}
      >
        <Text
          style={{
            fontFamily: "Questrial",
            fontSize: 20,
            fontStyle: "italic",
            color: theme.colors.accent,
            letterSpacing: 0,
          }}
          accessibilityRole="text"
        >
          {eyebrow}
        </Text>
        <Text
          style={{
            fontFamily: "Staatliches",
            fontSize: 44,
            lineHeight: 46,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            color: "#FFFDF9",
          }}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {supporting ? (
          <Text
            style={{
              fontFamily: "Questrial",
              fontSize: 15,
              lineHeight: 22,
              letterSpacing: 0.15,
              color: "rgba(255,253,249,0.72)",
              maxWidth: 420,
            }}
          >
            {supporting}
          </Text>
        ) : null}
        {action ? <View style={{ marginTop: theme.space[2] }}>{action}</View> : null}
      </View>
    </View>
  );
}
