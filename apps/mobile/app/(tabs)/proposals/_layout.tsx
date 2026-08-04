import { Stack } from "expo-router";
import { useTheme } from "../../../src/ui";

export default function ProposalsLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.canvas },
        animation: "slide_from_right",
      }}
    />
  );
}
