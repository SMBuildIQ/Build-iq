import React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useTheme } from "./ThemeContext";

type BrandMarkProps = {
  size?: number;
  variant?: "iq" | "full";
  inverse?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** IQ / Supply Monkey brand mark — geometric, not generic Expo artwork. */
export function BrandMark({
  size = 48,
  variant = "iq",
  inverse = false,
  style,
}: BrandMarkProps) {
  const { theme } = useTheme();
  const ink = inverse ? "#FFFDF9" : theme.mode === "dark" ? "#F5EFE6" : "#161412";
  const accent = theme.colors.accent;

  return (
    <View style={[{ alignItems: "flex-start", gap: 8 }, style]} accessibilityLabel="BuildIQ">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Rect x="0" y="0" width="48" height="48" fill={ink} />
          <Rect x="0" y="45" width="48" height="3" fill={accent} />
          <Path
            d="M12 34V14h6.2c4.6 0 7.4 2.4 7.4 6.2 0 2.6-1.3 4.5-3.5 5.5L28.8 34h-6.4l-5.6-7.6H18V34H12zm6-13.2h.8c1.7 0 2.7-.9 2.7-2.3S20.5 16 18.8 16H18v4.8zM32 34V14h5.6v20H32z"
            fill={inverse ? "#161412" : theme.mode === "dark" ? "#12100E" : "#FFFDF9"}
          />
        </Svg>
      </View>
      {variant === "full" ? (
        <View>
          <Text
            style={{
              fontFamily: "Staatliches",
              fontSize: Math.max(18, size * 0.42),
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: ink,
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
              color: accent,
            }}
          >
            Supply Monkey
          </Text>
        </View>
      ) : null}
    </View>
  );
}
