import React from "react";
import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "./ThemeContext";

type FilterChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Square filter chip — never rounded-full. */
export function FilterChip({ label, active = false, onPress, style }: FilterChipProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress?.();
      }}
      style={[
        {
          height: 40,
          paddingHorizontal: theme.space[4],
          alignItems: "center",
          justifyContent: "center",
          borderRadius: theme.radius.none,
          borderWidth: theme.stroke.hairline,
          borderColor: active ? theme.colors.brandInk : theme.colors.borderStrong,
          backgroundColor: active ? theme.colors.brandInk : "transparent",
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
          color: active ? theme.colors.textInverse : theme.colors.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
