import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../src/ui";
import { useCart } from "../../src/context/CartContext";
import { TabGlyph, type TabIconName } from "../../src/ui/TabIcons";

function TabIcon({
  name,
  label,
  focused,
}: {
  name: TabIconName;
  label: string;
  focused: boolean;
}) {
  const { theme, reduceMotion } = useTheme();
  const indicatorOpacity = useSharedValue(focused ? 1 : 0);
  const indicatorWidth = useSharedValue(focused ? 1 : 0.35);
  const color = focused ? theme.colors.accent : theme.colors.textMuted;

  useEffect(() => {
    const duration = reduceMotion ? 0 : theme.motion.base;
    indicatorOpacity.value = withTiming(focused ? 1 : 0, { duration });
    indicatorWidth.value = withTiming(focused ? 1 : 0.35, { duration });
  }, [focused, indicatorOpacity, indicatorWidth, reduceMotion, theme.motion.base]);

  const hairlineStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    transform: [{ scaleX: indicatorWidth.value }],
  }));

  return (
    <View style={{ alignItems: "center", justifyContent: "center", minWidth: 56, paddingTop: 4 }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: -6,
            left: 8,
            right: 8,
            height: 2,
            backgroundColor: theme.colors.accent,
          },
          hairlineStyle,
        ]}
      />
      <View style={{ marginBottom: 3, height: 24, width: 24, alignItems: "center", justifyContent: "center" }}>
        <TabGlyph name={name} color={color} focused={focused} size={24} />
      </View>
      <Text
        style={{
          fontFamily: "Questrial",
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 1.6,
          textTransform: "uppercase",
          color,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { count } = useCart();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: theme.layout.tabBarHeight + Math.max(insets.bottom, theme.space[2]),
          paddingBottom: Math.max(insets.bottom, theme.space[2]),
          paddingTop: theme.space[2],
          backgroundColor: theme.colors.surface,
          borderTopWidth: theme.stroke.hairline,
          borderTopColor: theme.colors.border,
          elevation: 0,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarIcon: ({ focused }) => <TabIcon name="jobs" label="Jobs" focused={focused} />,
          tabBarAccessibilityLabel: "Jobs",
        }}
      />
      <Tabs.Screen
        name="proposals"
        options={{
          title: "Proposals",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="proposals" label="Proposals" focused={focused} />
          ),
          tabBarAccessibilityLabel: "Proposals",
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shop",
          tabBarIcon: ({ focused }) => <TabIcon name="shop" label="Shop" focused={focused} />,
          tabBarAccessibilityLabel: "Shop",
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.accent,
            color: theme.colors.textInverse,
            fontSize: 10,
            borderRadius: 0,
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
          tabBarIcon: ({ focused }) => <TabIcon name="cart" label="Cart" focused={focused} />,
          tabBarAccessibilityLabel: "Cart",
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: "Track",
          href: null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => <TabIcon name="more" label="More" focused={focused} />,
          tabBarAccessibilityLabel: "More",
        }}
      />
    </Tabs>
  );
}
