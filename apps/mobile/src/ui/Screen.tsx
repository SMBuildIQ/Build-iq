import React, { type ReactNode } from "react";
import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "./ThemeContext";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  edges?: ("top" | "right" | "bottom" | "left")[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  gutter?: boolean;
};

export function Screen({
  children,
  scroll = false,
  edges = ["top", "left", "right"],
  style,
  contentStyle,
  gutter = false,
}: ScreenProps) {
  const { theme, gutter: screenGutter } = useTheme();

  const padding = gutter ? { paddingHorizontal: screenGutter } : undefined;

  if (scroll) {
    return (
      <SafeAreaView
        edges={edges}
        style={[{ flex: 1, backgroundColor: theme.colors.canvas }, style]}
      >
        <ScrollView
          contentContainerStyle={[{ flexGrow: 1 }, padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={edges}
      style={[{ flex: 1, backgroundColor: theme.colors.canvas }, style]}
    >
      <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}
