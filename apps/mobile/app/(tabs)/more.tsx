import React from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import {
  BrandMark,
  Button,
  HeroBand,
  ListRow,
  Screen,
  useTheme,
} from "../../src/ui";
import { useAuth } from "../../src/context/AuthContext";
import { hasPermission } from "@buildiq/permissions";

/** M9 — Account + appearance; Track linked separately */
export default function MoreScreen() {
  const { theme, preference, setPreference, mode, gutter } = useTheme();
  const { session, signOut } = useAuth();
  const dark = mode === "dark";

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.space[10] }}
        showsVerticalScrollIndicator={false}
      >
        <HeroBand
          eyebrow="Account"
          title="More"
          supporting="Company settings and appearance."
        />

        <View style={{ paddingHorizontal: gutter, paddingTop: theme.space[6], gap: theme.space[7] }}>
          <View style={{ flexDirection: "row", gap: theme.space[4], alignItems: "center" }}>
            <BrandMark size={48} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  fontFamily: "Staatliches",
                  fontSize: 24,
                  letterSpacing: 0.96,
                  textTransform: "uppercase",
                  color: theme.colors.text,
                }}
              >
                {session?.name ?? "Guest"}
              </Text>
              <Text style={{ fontFamily: "Questrial", fontSize: 14, color: theme.colors.textSecondary }}>
                {session?.companyName ?? "—"}  ·  {session?.role ?? "VIEWER"}
              </Text>
              <Text style={{ fontFamily: "Questrial", fontSize: 13, color: theme.colors.textMuted }}>
                {session?.email}
              </Text>
            </View>
          </View>

          <Row
            label="Dark mode"
            trailing={
              <Switch
                value={dark}
                onValueChange={(v) => setPreference(v ? "dark" : "light")}
                trackColor={{ false: theme.colors.borderStrong, true: theme.colors.accent }}
                thumbColor="#FFFDF9"
                accessibilityLabel="Toggle dark mode"
              />
            }
          />
          <Text style={{ fontFamily: "Questrial", fontSize: 12, color: theme.colors.textMuted }}>
            Appearance: {preference === "system" ? "System" : preference}
            {"  ·  "}
            <Text
              onPress={() => setPreference("system")}
              style={{ color: theme.colors.accent }}
            >
              Use system
            </Text>
          </Text>

          <ListRow
            title="Order tracking"
            meta="Yard pull through delivery status"
            onPress={() => router.push("/(tabs)/track")}
          />

          {session && hasPermission(session.role, "team:invite") ? (
            <Button label="Invite teammate" variant="secondary" onPress={() => undefined} />
          ) : null}

          {session && hasPermission(session.role, "spruce:configure") ? (
            <Button label="Spruce settings" variant="ghost" onPress={() => undefined} />
          ) : null}

          <Button
            label="Sign out"
            variant="secondary"
            onPress={async () => {
              await signOut();
              router.replace("/(auth)/login");
            }}
          />
          {session && hasPermission(session.role, "account:delete") ? (
            <Button label="Delete account" variant="ghost" onPress={() => undefined} />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, trailing }: { label: string; trailing: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 52,
        borderTopWidth: theme.stroke.hairline,
        borderTopColor: theme.colors.border,
        paddingVertical: theme.space[3],
      }}
    >
      <Text
        style={{
          fontFamily: "Staatliches",
          fontSize: 18,
          letterSpacing: 0.72,
          textTransform: "uppercase",
          color: theme.colors.text,
        }}
      >
        {label}
      </Text>
      {trailing}
    </View>
  );
}
