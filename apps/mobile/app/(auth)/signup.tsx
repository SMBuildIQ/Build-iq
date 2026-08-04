import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Redirect, router, type Href } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { BrandMark, Button, Screen, TextField, useTheme } from "../../src/ui";
import { useAuth } from "../../src/context/AuthContext";
import { registerSchema } from "@buildiq/validation";

/** M1b — Create account */
export default function SignupScreen() {
  const { session, signUp } = useAuth();
  const { theme, gutter, reduceMotion } = useTheme();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
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

  async function onSubmit() {
    setError(undefined);
    const parsed = registerSchema.safeParse({ name, email, password, companyName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid registration");
      return;
    }
    setLoading(true);
    try {
      await signUp(parsed.data);
      router.replace("/(tabs)/jobs");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={["top", "left", "right", "bottom"]}>
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
            Join the yard
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
            Create account
          </Text>
        </View>
        <TextField label="Your name" value={name} onChangeText={setName} autoComplete="name" />
        <TextField
          label="Company"
          value={companyName}
          onChangeText={setCompanyName}
          autoComplete="organization"
        />
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
          autoComplete="new-password"
          error={error}
        />
        <Button
          label={loading ? "Creating…" : "Create account"}
          onPress={onSubmit}
          disabled={loading}
          accessibilityLabel="Create account"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Already have an account"
          onPress={() => router.replace("/(auth)/login" as Href)}
          style={{ alignSelf: "flex-start" }}
        >
          <Text style={{ fontFamily: "Questrial", fontSize: 14, color: theme.colors.accent }}>
            Already have an account
          </Text>
        </Pressable>
      </Animated.View>
    </Screen>
  );
}
