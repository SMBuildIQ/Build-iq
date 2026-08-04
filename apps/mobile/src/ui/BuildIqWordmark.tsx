import React from "react";
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Svg, { Path, Ellipse } from "react-native-svg";

type BuildIqWordmarkProps = {
  /** Staatliches display size for the wordmark */
  fontSize?: number;
  color?: string;
  accentColor?: string;
  align?: "left" | "center";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/** Tiny banana peel perched on the I in IQ. */
function BananaPeel({ size }: { size: number }) {
  const w = size;
  const h = size * 0.72;
  return (
    <Svg width={w} height={h} viewBox="0 0 32 22">
      {/* stem */}
      <Path d="M15.2 1.2c.4-.8 1.2-.8 1.6 0l.6 1.4c.2.4 0 .8-.4.9h-2c-.4 0-.6-.5-.4-.9l.6-1.4z" fill="#6B4A2A" />
      {/* left peel */}
      <Path
        d="M15.5 3.2c-1.2.2-3.8 1.4-5.8 4.2-2.2 3.1-3.4 7.2-2.6 9.2.4 1 1.6.8 2.2-.2 1.4-2.2 2.8-5.4 4.2-7.6 1-1.6 2-2.8 2.8-3.4-.4-.8-.6-1.6-.8-2.2z"
        fill="#F5C542"
      />
      <Path
        d="M15.2 4c-1 .2-3 1.4-4.6 3.6-1.6 2.2-2.6 4.8-2.8 6.2"
        stroke="#E8A317"
        strokeWidth={0.9}
        fill="none"
        strokeLinecap="round"
      />
      {/* center peel */}
      <Path
        d="M16 3.1c.2 1.4.4 4.2.2 7.2-.2 2.8-.8 5.6-1.2 7.2-.2.8.4 1.4 1.1 1.1 1.2-.5 2.4-2.8 3-5.6.6-2.8.6-6.2.2-8.4-.6-.8-2-.8-3.3-1.5z"
        fill="#FFE066"
      />
      {/* right peel */}
      <Path
        d="M16.5 3.2c1.2.2 3.8 1.4 5.8 4.2 2.2 3.1 3.4 7.2 2.6 9.2-.4 1-1.6.8-2.2-.2-1.4-2.2-2.8-5.4-4.2-7.6-1-1.6-2-2.8-2.8-3.4.4-.8.6-1.6.8-2.2z"
        fill="#F0B429"
      />
      <Path
        d="M16.8 4c1 .2 3 1.4 4.6 3.6 1.6 2.2 2.6 4.8 2.8 6.2"
        stroke="#D4920F"
        strokeWidth={0.9}
        fill="none"
        strokeLinecap="round"
      />
      {/* soft highlight */}
      <Ellipse cx={16} cy={6.5} rx={1.4} ry={2.2} fill="#FFF6C2" opacity={0.55} />
    </Svg>
  );
}

/** BUILD in ink + orange IQ with a banana peel on the I. */
export function BuildIqWordmark({
  fontSize = 22,
  color = "#1A1410",
  accentColor = "#FF8833",
  align = "left",
  style,
  textStyle,
}: BuildIqWordmarkProps) {
  const letterSpacing = fontSize >= 36 ? 2 : 1.6;
  const bananaSize = Math.max(10, Math.round(fontSize * 0.42));
  const baseText: TextStyle = {
    fontFamily: "Staatliches",
    fontSize,
    letterSpacing,
    textTransform: "uppercase",
    lineHeight: fontSize * 1.05,
  };

  const peelLift = Math.round(bananaSize * 0.78);

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: align === "center" ? "center" : "flex-start",
          paddingTop: peelLift,
          overflow: "visible",
        },
        style,
      ]}
      accessible
      accessibilityLabel="BuildIQ"
    >
      <Text style={[baseText, { color }, textStyle]}>Build</Text>
      <View style={{ position: "relative", overflow: "visible" }}>
        <View
          style={{
            position: "absolute",
            top: -peelLift + 2,
            left: fontSize * 0.06,
            zIndex: 2,
            width: bananaSize,
            alignItems: "center",
          }}
          pointerEvents="none"
        >
          <BananaPeel size={bananaSize} />
        </View>
        <Text style={[baseText, { color: accentColor }, textStyle]}>IQ</Text>
      </View>
    </View>
  );
}
