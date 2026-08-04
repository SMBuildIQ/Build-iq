import React, { useState } from "react";
import { Alert, Linking, ScrollView, Switch, Text, View } from "react-native";
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
import { LEGAL, LEGAL_URLS } from "../../src/config/legal";
import { hasPermission } from "@buildiq/permissions";

/** M9 — Account + appearance + store-required legal / deletion */
export default function MoreScreen() {
  const { theme, preference, setPreference, mode, gutter } = useTheme();
  const { session, signOut, deleteAccount } = useAuth();
  const dark = mode === "dark";
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your BuildIQ account and related workspace data you own. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert("Confirm deletion", 'Type DELETE is confirmed when you tap "Delete forever".', [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete forever",
                style: "destructive",
                onPress: () => void runDelete(),
              },
            ]);
          },
        },
      ]
    );
  }

  async function runDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      Alert.alert("Account deleted", "Your account has been removed.");
      router.replace("/(auth)/login");
    } catch (e) {
      Alert.alert(
        "Could not delete",
        e instanceof Error
          ? e.message
          : `Email ${LEGAL.supportEmail} with subject “Account deletion request”.`
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.space[10] }}
        showsVerticalScrollIndicator={false}
      >
        <HeroBand
          tone="account"
          eyebrow="Account"
          title="More"
          supporting="Company settings, legal, and appearance."
        />

        <View style={{ paddingHorizontal: gutter, paddingTop: theme.space[6], gap: theme.space[7] }}>
          <View style={{ gap: theme.space[4] }}>
            <BrandMark size={52} variant="full" />
            <View style={{ gap: 4 }}>
              <Text
                style={{
                  fontFamily: "Staatliches",
                  fontSize: 22,
                  letterSpacing: 0.88,
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

          <View style={{ gap: theme.space[2] }}>
            <Text
              style={{
                fontFamily: "Staatliches",
                fontSize: 18,
                letterSpacing: 0.72,
                textTransform: "uppercase",
                color: theme.colors.text,
              }}
            >
              Legal & support
            </Text>
            <ListRow
              title="Privacy Policy"
              meta={LEGAL_URLS.privacy}
              onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}
            />
            <ListRow
              title="Terms of Service"
              meta={LEGAL_URLS.terms}
              onPress={() => void Linking.openURL(LEGAL_URLS.terms)}
            />
            <ListRow
              title="Support"
              meta={LEGAL.supportEmail}
              onPress={() => void Linking.openURL(LEGAL_URLS.support)}
            />
            <Text style={{ fontFamily: "Questrial", fontSize: 12, color: theme.colors.textMuted }}>
              {LEGAL.developerName} · {LEGAL.address}
            </Text>
          </View>

          <Button
            label="Sign out"
            variant="secondary"
            onPress={async () => {
              await signOut();
              router.replace("/(auth)/login");
            }}
          />
          {session && hasPermission(session.role, "account:delete") ? (
            <Button
              label={deleting ? "Deleting…" : "Delete account"}
              variant="ghost"
              disabled={deleting}
              accessibilityLabel="Delete account"
              onPress={confirmDelete}
            />
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
