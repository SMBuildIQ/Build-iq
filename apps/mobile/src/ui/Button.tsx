import React from "react";
import {
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "./ThemeContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = "primary" | "secondary" | "inverse" | "ghost";

type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: ButtonVariant;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = "primary",
  compact = false,
  disabled,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: ButtonProps) {
  const { theme, reduceMotion } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const height = compact ? 44 : theme.layout.buttonHeight;

  const palette = (() => {
    switch (variant) {
      case "primary":
        return {
          bg: theme.colors.accent,
          bgPressed: theme.colors.accentPressed,
          border: theme.colors.accent,
          text: theme.colors.textInverse,
        };
      case "secondary":
        return {
          bg: "transparent",
          bgPressed: theme.colors.surfaceMuted,
          border: theme.colors.brand,
          text: theme.colors.brandInk,
        };
      case "inverse":
        return {
          bg: theme.colors.textInverse,
          bgPressed: theme.colors.surface,
          border: theme.colors.textInverse,
          text: theme.colors.inverse,
        };
      case "ghost":
        return {
          bg: "transparent",
          bgPressed: theme.colors.surfaceMuted,
          border: "transparent",
          text: theme.colors.text,
        };
    }
  })();

  const [pressed, setPressed] = React.useState(false);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPressIn={(e) => {
        setPressed(true);
        scale.value = withTiming(reduceMotion ? 1 : 0.98, {
          duration: theme.motion.fast,
        });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        scale.value = withTiming(1, { duration: theme.motion.fast });
        onPressOut?.(e);
      }}
      style={[
        animatedStyle,
        {
          height,
          paddingHorizontal: theme.space[5],
          alignItems: "center",
          justifyContent: "center",
          borderRadius: theme.radius.none,
          borderWidth: variant === "ghost" ? 0 : theme.stroke.cta,
          borderColor: palette.border,
          backgroundColor: pressed ? palette.bgPressed : palette.bg,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
      {...rest}
    >
      <Text
        style={{
          fontFamily: "Staatliches",
          fontSize: 16,
          letterSpacing: 1.28,
          textTransform: "uppercase",
          color: palette.text,
        }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
