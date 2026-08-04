import React, { useCallback, useEffect } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "./ThemeContext";

const DISMISS_THRESHOLD = 120;
const SHEET_SHADOW = {
  shadowColor: "#161412",
  shadowOffset: { width: 0, height: -8 },
  shadowOpacity: 0.18,
  shadowRadius: 32,
  elevation: 16,
} as const;

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  accessibilityViewIsModal?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Sheet({
  visible,
  onClose,
  title,
  children,
  accessibilityViewIsModal = true,
  style,
}: SheetProps) {
  const { theme, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(400);
  const scrimOpacity = useSharedValue(0);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  const animateOpen = useCallback(() => {
    const spring = theme.motion.spring;
    if (reduceMotion) {
      translateY.value = 0;
      scrimOpacity.value = 1;
      return;
    }
    translateY.value = withSpring(0, {
      stiffness: spring.stiffness,
      damping: spring.damping,
    });
    scrimOpacity.value = withTiming(1, { duration: theme.motion.enter });
  }, [reduceMotion, scrimOpacity, theme.motion, translateY]);

  const animateClose = useCallback(
    (then?: () => void) => {
      if (reduceMotion) {
        translateY.value = 400;
        scrimOpacity.value = 0;
        then?.();
        return;
      }
      translateY.value = withSpring(
        480,
        {
          stiffness: theme.motion.spring.stiffness,
          damping: theme.motion.spring.damping,
        },
        (finished) => {
          if (finished && then) runOnJS(then)();
        }
      );
      scrimOpacity.value = withTiming(0, { duration: theme.motion.base });
    },
    [reduceMotion, scrimOpacity, theme.motion, translateY]
  );

  useEffect(() => {
    if (visible) {
      translateY.value = 400;
      scrimOpacity.value = 0;
      animateOpen();
    }
  }, [animateOpen, scrimOpacity, translateY, visible]);

  const requestClose = useCallback(() => {
    animateClose(close);
  }, [animateClose, close]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      const shouldDismiss =
        e.translationY > DISMISS_THRESHOLD || e.velocityY > 900;
      if (shouldDismiss) {
        translateY.value = withSpring(
          480,
          {
            stiffness: theme.motion.spring.stiffness,
            damping: theme.motion.spring.damping,
          },
          (finished) => {
            if (finished) runOnJS(close)();
          }
        );
        scrimOpacity.value = withTiming(0, { duration: theme.motion.base });
      } else {
        translateY.value = withSpring(0, {
          stiffness: theme.motion.spring.stiffness,
          damping: theme.motion.spring.damping,
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
      accessibilityViewIsModal={accessibilityViewIsModal}
    >
      <View style={styles.root} accessibilityViewIsModal={accessibilityViewIsModal}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }, scrimStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={requestClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss sheet"
          />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            accessibilityRole="summary"
            accessibilityLabel={title ? `${title} sheet` : "Bottom sheet"}
            style={[
              styles.sheet,
              SHEET_SHADOW,
              {
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: theme.radius.none,
                borderTopRightRadius: theme.radius.none,
                paddingBottom: Math.max(insets.bottom, theme.space[5]),
              },
              sheetStyle,
              style,
            ]}
          >
            <View
              style={styles.grabberHit}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Sheet grabber, swipe down to dismiss"
            >
              <View
                style={[
                  styles.grabber,
                  { backgroundColor: theme.colors.borderStrong },
                ]}
              />
            </View>

            {title ? (
              <Text
                style={{
                  fontFamily: "Staatliches",
                  fontSize: 24,
                  letterSpacing: 0.96,
                  textTransform: "uppercase",
                  color: theme.colors.text,
                  paddingHorizontal: theme.space[5],
                  paddingBottom: theme.space[4],
                }}
                accessibilityRole="header"
              >
                {title}
              </Text>
            ) : null}

            <View style={{ paddingHorizontal: theme.space[5] }}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    maxHeight: "88%",
  },
  grabberHit: {
    alignItems: "center",
    paddingVertical: 12,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 0,
  },
});
