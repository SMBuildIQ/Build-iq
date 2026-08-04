import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { BrandMark } from "../src/ui";
import { useAuth } from "../src/context/AuthContext";
import { useTheme } from "../src/ui";

/** M0 — Splash / Boot */
export default function SplashIndex() {
  const { session, bootstrapped } = useAuth();
  const { reduceMotion } = useTheme();
  const [done, setDone] = useState(false);
  const progress = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (!bootstrapped) return;
    const duration = reduceMotion ? 80 : 900;
    progress.value = withTiming(1, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
    const t = setTimeout(() => {
      fade.value = withTiming(0, { duration: reduceMotion ? 0 : 220 });
      setTimeout(() => setDone(true), reduceMotion ? 0 : 220);
    }, duration);
    return () => clearTimeout(t);
  }, [bootstrapped, progress, fade, reduceMotion]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const rootStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
  }));

  if (done && bootstrapped) {
    return <Redirect href={session ? "/(tabs)/jobs" : "/(auth)/login"} />;
  }

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          backgroundColor: "#161412",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 40,
        },
        rootStyle,
      ]}
    >
      <BrandMark size={72} inverse />
      <View
        style={{
          position: "absolute",
          bottom: 64,
          left: 40,
          right: 40,
          height: 2,
          backgroundColor: "rgba(255,253,249,0.12)",
        }}
      >
        <Animated.View
          style={[
            {
              height: 2,
              backgroundColor: "#FF8833",
            },
            barStyle,
          ]}
        />
      </View>
    </Animated.View>
  );
}
