import React, { type ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "./ThemeContext";

type HeroBandProps = {
  eyebrow: string;
  title: string;
  supporting?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Dark hero band with orange 3px rule at bottom. */
export function HeroBand({ eyebrow, title, supporting, action, style }: HeroBandProps) {
  const { theme, gutter } = useTheme();

  return (
    <View
      style={[
        {
          minHeight: theme.layout.heroMinHeight,
          backgroundColor: theme.mode === "dark" ? theme.colors.inverseLift : "#161412",
          paddingHorizontal: gutter,
          paddingTop: theme.space[6],
          paddingBottom: theme.space[6],
          borderBottomWidth: 3,
          borderBottomColor: theme.colors.accent,
          justifyContent: "flex-end",
          gap: theme.space[3],
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: "Questrial",
          fontSize: 20,
          fontStyle: "italic",
          color: theme.colors.accent,
          letterSpacing: 0,
        }}
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
  );
}
