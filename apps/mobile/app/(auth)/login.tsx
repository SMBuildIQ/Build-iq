import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Redirect, router, type Href } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { BrandMark, Button, Screen, TextField, useTheme } from "../../src/ui";
import { useAuth } from "../../src/context/AuthContext";
import { allowDemoAuth, LEGAL, LEGAL_URLS } from "../../src/config/legal";
import { loginSchema } from "@buildiq/validation";

/** M1 — Login (store-safe: no prefills / demo in production) */
export default function LoginScreen() {
  const { session, signIn, signInDemo } = useAuth();
  const { theme, gutter, reduceMotion, isTablet } = useTheme();
  const { width, height } = useWindowDimensions();
  const demo = allowDemoAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const enter = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    enter.value = withTiming(1, {
      duration: theme.motion.enter,
      easing: Easing.out(Easing.cubic),
    });
  }, [enter, theme.motion.enter]);

  const formStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 24 }],
  }));

  if (session) return <Redirect href="/(tabs)/jobs" />;

  const landscapeSplit = isTablet && width > height;

  async function onSubmit() {
    setError(undefined);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid credentials");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/(tabs)/jobs");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  function onForgotPassword() {
    const subject = encodeURIComponent("BuildIQ password reset");
    const body = encodeURIComponent(
      "Please reset the password for my BuildIQ account.\n\nEmail: "
    );
    void Linking.openURL(`mailto:${LEGAL.supportEmail}?subject=${subject}&body=${body}`);
  }

  const form = (
    <Animated.View
      style={[
        {
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: gutter,
          paddingVertical: theme.space[8],
          gap: theme.space[5],
          maxWidth: 440,
          width: "100%",
          alignSelf: "center",
        },
        formStyle,
      ]}
    >
      <BrandMark size={56} variant="full" />
      <View style={{ gap: theme.space[1] }}>
        <Text
          style={{
            fontFamily: "Questrial",
            fontSize: 22,
            fontStyle: "italic",
            color: theme.colors.accent,
          }}
        >
          Welcome back
        </Text>
        <Text
          style={{
            fontFamily: "Staatliches",
            fontSize: 40,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: theme.colors.text,
          }}
        >
          Sign in
        </Text>
      </View>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        error={error}
      />
      <Button label={loading ? "Signing in…" : "Sign in"} onPress={onSubmit} disabled={loading} />
      <Button
        label="Create account"
        variant="secondary"
        accessibilityLabel="Create account"
        onPress={() => router.push("/(auth)/signup" as Href)}
      />
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: theme.space[3] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
          onPress={onForgotPassword}
        >
          <Text style={{ fontFamily: "Questrial", fontSize: 14, color: theme.colors.textSecondary }}>
            Forgot password
          </Text>
        </Pressable>
        {demo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue demo"
            onPress={async () => {
              await signInDemo();
              router.replace("/(tabs)/jobs");
            }}
          >
            <Text style={{ fontFamily: "Questrial", fontSize: 14, color: theme.colors.accent }}>
              Continue demo
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space[3], marginTop: theme.space[2] }}>
        <LegalLink label="Privacy" url={LEGAL_URLS.privacy} />
        <LegalLink label="Terms" url={LEGAL_URLS.terms} />
        <LegalLink label="Support" url={LEGAL_URLS.support} />
      </View>
    </Animated.View>
  );

  if (landscapeSplit) {
    return (
      <Screen edges={["top", "left", "right", "bottom"]}>
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "#161412",
              borderRightWidth: 3,
              borderRightColor: theme.colors.accent,
              padding: theme.space[8],
              justifyContent: "flex-end",
            }}
          >
            <Text
              style={{
                fontFamily: "Questrial",
                fontSize: 24,
                fontStyle: "italic",
                color: theme.colors.accent,
              }}
            >
              Millwork Studio
            </Text>
            <Text
              style={{
                fontFamily: "Staatliches",
                fontSize: 56,
                lineHeight: 58,
                letterSpacing: 2.8,
                textTransform: "uppercase",
                color: "#FFFDF9",
                marginTop: theme.space[2],
              }}
            >
              Luxury jobsite{"\n"}intelligence
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>{form}</View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll edges={["top", "left", "right", "bottom"]}>
      {form}
    </Screen>
  );
}

function LegalLink({ label, url }: { label: string; url: string }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => {
        void Linking.openURL(url).catch(() =>
          Alert.alert(label, `Open ${url} in a browser, or email ${LEGAL.supportEmail}.`)
        );
      }}
    >
      <Text
        style={{
          fontFamily: "Questrial",
          fontSize: 13,
          color: theme.colors.textMuted,
          textDecorationLine: "underline",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
