import React, { type ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { heroPhoto, type HeroTone } from "@buildiq/design-tokens";
import { useTheme } from "./ThemeContext";

type HeroBandProps = {
  eyebrow: string;
  title: string;
  supporting?: string;
  action?: ReactNode;
  /** Theme photo matched to Supply Monkey site content */
  tone?: HeroTone;
  /** Full-bleed photo behind scrim. Defaults on. */
  showPhoto?: boolean;
  /** Override URI when needed */
  imageUri?: string;
  style?: StyleProp<ViewStyle>;
};

/** Dark hero band with page-specific stock photo, scrim, and orange 3px rule. */
export function HeroBand({
  eyebrow,
  title,
  supporting,
  action,
  tone = "jobs",
  showPhoto = true,
  imageUri,
  style,
}: HeroBandProps) {
  const { theme, gutter } = useTheme();
  const base = theme.mode === "dark" ? theme.colors.inverseLift : "#161412";
  const photo = heroPhoto(tone);
  const uri = imageUri ?? photo.uri;

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
          source={{ uri }}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          contentFit="cover"
          transition={theme.motion.enter as number}
          accessibilityIgnoresInvertColors
          accessibilityLabel={photo.alt}
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
