import React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "./ThemeContext";

const markAsset = require("../../assets/brand/mark.png");
const logoIqAsset = require("../../assets/brand/logo-iq.png");

type BrandMarkProps = {
  size?: number;
  /** iq = monkey mark only · full = mark + BuildIQ wordmark · lockup = Supply Monkey IQ bar */
  variant?: "iq" | "full" | "lockup";
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
  const subColor = inverse ? theme.colors.accent : theme.colors.accent;

  if (variant === "lockup") {
    return (
      <View
        style={[{ alignItems: "flex-start" }, style]}
        accessibilityLabel="BuildIQ by Supply Monkey"
        accessible
      >
        <Image
          source={logoIqAsset}
          style={{ width: size * 2.5, height: size }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <Text
          style={{
            marginTop: 8,
            fontFamily: "Staatliches",
            fontSize: Math.max(22, size * 0.48),
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: titleColor,
          }}
        >
          BuildIQ
        </Text>
        <Text
          style={{
            fontFamily: "Questrial",
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: subColor,
          }}
        >
          Supply Monkey Lumber & Materials
        </Text>
      </View>
    );
  }

  const mark = (
    <Image
      source={markAsset}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityIgnoresInvertColors
    />
  );

  if (variant === "iq") {
    return (
      <View style={style} accessibilityLabel="Supply Monkey" accessible>
        {mark}
      </View>
    );
  }

  // Splash / inverse: stacked mark + BuildIQ wordmark
  if (inverse) {
    return (
      <View
        style={[{ alignItems: "center", gap: 14 }, style]}
        accessibilityLabel="BuildIQ by Supply Monkey"
        accessible
      >
        {mark}
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text
            style={{
              fontFamily: "Staatliches",
              fontSize: Math.max(28, size * 0.55),
              letterSpacing: 2,
              textTransform: "uppercase",
              color: titleColor,
            }}
          >
            BuildIQ
          </Text>
          <Text
            style={{
              fontFamily: "Questrial",
              fontSize: 11,
              letterSpacing: 1.8,
              textTransform: "uppercase",
              color: subColor,
            }}
          >
            Supply Monkey
          </Text>
        </View>
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
      <View style={{ gap: 2 }}>
        <Text
          style={{
            fontFamily: "Staatliches",
            fontSize: Math.max(22, size * 0.48),
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: titleColor,
          }}
        >
          BuildIQ
        </Text>
        <Text
          style={{
            fontFamily: "Questrial",
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: subColor,
          }}
        >
          Supply Monkey
        </Text>
      </View>
    </View>
  );
}
