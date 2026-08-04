import React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "./ThemeContext";
import { BuildIqWordmark } from "./BuildIqWordmark";

/** Transparent Supply Monkey circle mark (no black plate). */
const markAsset = require("../../assets/brand/monkey-mark.png");
const logoIqAsset = require("../../assets/brand/logo-iq.png");

type BrandMarkProps = {
  size?: number;
  /** iq = mark only · full = mark + BuildIQ (row) · stacked = centered column · lockup = IQ bar art */
  variant?: "iq" | "full" | "stacked" | "lockup";
  inverse?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Supply Monkey mark + BuildIQ wordmark. */
export function BrandMark({
  size = 48,
  variant = "iq",
  inverse = false,
  style,
}: BrandMarkProps) {
  const { theme } = useTheme();
  const titleColor = inverse ? "#FFFDF9" : theme.colors.text;
  const accentColor = theme.colors.accent;
  const subColor = theme.colors.accent;

  const mark = (
    <Image
      source={markAsset}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityIgnoresInvertColors
    />
  );

  const wordmarkSize = Math.max(22, size * (inverse || variant === "stacked" ? 0.55 : 0.48));
  const wordmarkAlign = variant === "stacked" || inverse ? "center" : "left";

  if (variant === "lockup") {
    return (
      <View
        style={[{ alignItems: "center" }, style]}
        accessibilityLabel="BuildIQ by Supply Monkey"
        accessible
      >
        <Image
          source={logoIqAsset}
          style={{ width: size * 2.5, height: size }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <BuildIqWordmark
          fontSize={Math.max(22, size * 0.48)}
          color={titleColor}
          accentColor={accentColor}
          align="center"
          style={{ marginTop: 10 }}
        />
      </View>
    );
  }

  if (variant === "iq") {
    return (
      <View style={style} accessibilityLabel="Supply Monkey" accessible>
        {mark}
      </View>
    );
  }

  const wordmark = (
    <View style={{ alignItems: wordmarkAlign === "center" ? "center" : "flex-start", gap: 2 }}>
      <BuildIqWordmark
        fontSize={wordmarkSize}
        color={titleColor}
        accentColor={accentColor}
        align={wordmarkAlign}
      />
      <Text
        style={{
          fontFamily: "Questrial",
          fontSize: 10,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          color: subColor,
          textAlign: wordmarkAlign,
        }}
      >
        Supply Monkey
      </Text>
    </View>
  );

  if (variant === "stacked" || inverse) {
    return (
      <View
        style={[{ alignItems: "center", gap: 14 }, style]}
        accessibilityLabel="BuildIQ by Supply Monkey"
        accessible
      >
        {mark}
        {wordmark}
      </View>
    );
  }

  return (
    <View
      style={[{ flexDirection: "row", alignItems: "center", gap: 12 }, style]}
      accessibilityLabel="BuildIQ by Supply Monkey"
      accessible
    >
      {mark}
      {wordmark}
    </View>
  );
}
