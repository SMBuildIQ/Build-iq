import React, { type ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { BrandMark } from "./BrandMark";
import { useTheme } from "./ThemeContext";

type EmptyStateProps = {
  hand: string;
  title?: string;
  body?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({ hand, title, body, action, style }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: theme.space[10],
          paddingHorizontal: theme.space[6],
          gap: theme.space[4],
        },
        style,
      ]}
    >
      <BrandMark size={56} variant="full" />
      <Text
        style={{
          fontFamily: "Questrial",
          fontSize: 22,
          fontStyle: "italic",
          color: theme.colors.accent,
          textAlign: "center",
        }}
      >
        {hand}
      </Text>
      {title ? (
        <Text
          style={{
            fontFamily: "Staatliches",
            fontSize: 28,
            letterSpacing: 1.12,
            textTransform: "uppercase",
            color: theme.colors.text,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      ) : null}
      {body ? (
        <Text
          style={{
            fontFamily: "Questrial",
            fontSize: 15,
            lineHeight: 22,
            color: theme.colors.textSecondary,
            textAlign: "center",
            maxWidth: 320,
          }}
        >
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: theme.space[2], width: "100%", maxWidth: 280 }}>{action}</View> : null}
    </View>
  );
}
