import React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "./ThemeContext";

export type StatusTone = "draft" | "progress" | "success" | "danger";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  style?: StyleProp<ViewStyle>;
};

export function StatusBadge({ label, tone = "draft", style }: StatusBadgeProps) {
  const { theme } = useTheme();
  const color =
    tone === "progress"
      ? theme.colors.progress
      : tone === "success"
        ? theme.colors.success
        : tone === "danger"
          ? theme.colors.danger
          : theme.colors.draft;

  return (
    <View
      accessibilityLabel={`Status ${label}`}
      style={[
        {
          paddingHorizontal: theme.space[2],
          paddingVertical: 3,
          borderWidth: theme.stroke.hairline,
          borderColor: color,
          borderRadius: theme.radius.none,
          backgroundColor: "transparent",
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: "Questrial",
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.76,
          textTransform: "uppercase",
          color,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
