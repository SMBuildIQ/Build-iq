import React, { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "./ThemeContext";

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = "100%", height = 16, style }: SkeletonProps) {
  const { theme, reduceMotion } = useTheme();
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.55;
      return;
    }
    opacity.value = withRepeat(
      withTiming(1, {
        duration: 900,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
  }, [reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        animatedStyle,
        {
          width,
          height,
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radius.none,
        },
        style,
      ]}
    />
  );
}

export function SkeletonListRow() {
  const { theme } = useTheme();
  return (
    <View
      style={{
        minHeight: theme.layout.listRowMinHeight,
        paddingVertical: theme.space[4],
        borderTopWidth: theme.stroke.hairline,
        borderTopColor: theme.colors.border,
        gap: theme.space[2],
      }}
    >
      <Skeleton width="55%" height={20} />
      <Skeleton width="80%" height={14} />
    </View>
  );
}
