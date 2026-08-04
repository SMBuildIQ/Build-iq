import React from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "./ThemeContext";
import { StatusBadge, type StatusTone } from "./StatusBadge";

type ListRowProps = {
  title: string;
  meta?: string;
  price?: string;
  status?: string;
  statusTone?: StatusTone;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ListRow({
  title,
  meta,
  price,
  status,
  statusTone = "draft",
  onPress,
  onLongPress,
  style,
}: ListRowProps) {
  const { theme } = useTheme();
  const [pressed, setPressed] = React.useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          minHeight: theme.layout.listRowMinHeight,
          paddingVertical: theme.space[4],
          paddingHorizontal: 0,
          borderTopWidth: theme.stroke.hairline,
          borderTopColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.surfaceMuted : "transparent",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.space[3],
        },
        style,
      ]}
    >
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space[2] }}>
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 1,
              fontFamily: "Staatliches",
              fontSize: 20,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: theme.colors.text,
            }}
          >
            {title}
          </Text>
          {status ? <StatusBadge label={status} tone={statusTone} /> : null}
        </View>
        {meta ? (
          <Text
            numberOfLines={2}
            style={{
              fontFamily: "Questrial",
              fontSize: 14,
              letterSpacing: 0.14,
              color: theme.colors.textSecondary,
              lineHeight: 20,
            }}
          >
            {meta}
          </Text>
        ) : null}
      </View>
      {price ? (
        <Text
          style={{
            fontFamily: "Staatliches",
            fontSize: 22,
            letterSpacing: 0.88,
            color: theme.colors.accent,
          }}
        >
          {price}
        </Text>
      ) : null}
    </Pressable>
  );
}
