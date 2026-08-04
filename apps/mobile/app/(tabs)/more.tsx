import React, { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import {
  BrandMark,
  Button,
  HeroBand,
  Screen,
  useTheme,
} from "../../src/ui";
import { useAuth } from "../../src/context/AuthContext";
import { hasPermission } from "@buildiq/permissions";

const TRACK_STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "pulled", label: "Yard pull" },
  { key: "staged", label: "Staged" },
  { key: "out", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
] as const;

/** M9 — Account + dark mode; Track (M8) embedded for v1 */
export default function MoreScreen() {
  const { theme, preference, setPreference, mode, gutter } = useTheme();
  const { session, signOut } = useAuth();
  const [activeStep, setActiveStep] = useState(2);
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
          supporting="Company settings, appearance, and order tracking."
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

          {session && hasPermission(session.role, "team:invite") ? (
            <Button label="Invite teammate" variant="secondary" onPress={() => undefined} />
          ) : null}

          {session && hasPermission(session.role, "spruce:configure") ? (
            <Button label="Spruce settings" variant="ghost" onPress={() => undefined} />
          ) : null}

          <View style={{ gap: theme.space[4] }}>
            <Text
              style={{
                fontFamily: "Staatliches",
                fontSize: 24,
                letterSpacing: 0.96,
                textTransform: "uppercase",
                color: theme.colors.text,
              }}
            >
              Track order
            </Text>
            <Text style={{ fontFamily: "Questrial", fontSize: 14, color: theme.colors.textSecondary }}>
              BQ-ORD-8841  ·  Oak Ridge Residence
            </Text>
            <View style={{ gap: 0 }}>
              {TRACK_STEPS.map((step, index) => {
                const active = index <= activeStep;
                const current = index === activeStep;
                return (
                  <Pressable
                    key={step.key}
                    onPress={() => setActiveStep(index)}
                    style={{ flexDirection: "row", gap: theme.space[4], minHeight: 56 }}
                  >
                    <View style={{ alignItems: "center", width: 16 }}>
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: theme.radius.none,
                          borderWidth: 1.5,
                          borderColor: active ? theme.colors.accent : theme.colors.borderStrong,
                          backgroundColor: current ? theme.colors.accent : "transparent",
                        }}
                      />
                      {index < TRACK_STEPS.length - 1 ? (
                        <View
                          style={{
                            flex: 1,
                            width: 2,
                            backgroundColor:
                              index < activeStep ? theme.colors.accent : theme.colors.border,
                          }}
                        />
                      ) : null}
                    </View>
                    <Text
                      style={{
                        fontFamily: current ? "Staatliches" : "Questrial",
                        fontSize: current ? 18 : 15,
                        letterSpacing: current ? 0.72 : 0.15,
                        textTransform: current ? "uppercase" : "none",
                        color: active ? theme.colors.text : theme.colors.textMuted,
                        paddingBottom: theme.space[4],
                      }}
                    >
                      {step.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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
