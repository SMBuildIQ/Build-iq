import React from "react";
import { Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/ui";
import { useCart } from "../../src/context/CartContext";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", minWidth: 56, paddingTop: 4 }}>
      <View
        style={{
          position: "absolute",
          top: -6,
          left: 8,
          right: 8,
          height: 2,
          backgroundColor: focused ? theme.colors.accent : "transparent",
        }}
      />
      <View
        style={{
          width: 18,
          height: 18,
          borderWidth: 1.5,
          borderColor: focused ? theme.colors.accent : theme.colors.textMuted,
          backgroundColor: focused ? theme.colors.accent : "transparent",
          marginBottom: 4,
        }}
      />
      <Text
        style={{
          fontFamily: "Questrial",
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 1.6,
          textTransform: "uppercase",
          color: focused ? theme.colors.accent : theme.colors.textMuted,
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
          tabBarIcon: ({ focused }) => <TabIcon label="Jobs" focused={focused} />,
          tabBarAccessibilityLabel: "Jobs",
        }}
      />
      <Tabs.Screen
        name="proposals"
        options={{
          title: "Proposals",
          tabBarIcon: ({ focused }) => <TabIcon label="Proposals" focused={focused} />,
          tabBarAccessibilityLabel: "Proposals",
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shop",
          tabBarIcon: ({ focused }) => <TabIcon label="Shop" focused={focused} />,
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
          tabBarIcon: ({ focused }) => <TabIcon label="Cart" focused={focused} />,
          tabBarAccessibilityLabel: "Cart",
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => <TabIcon label="More" focused={focused} />,
          tabBarAccessibilityLabel: "More",
        }}
      />
    </Tabs>
  );
}
