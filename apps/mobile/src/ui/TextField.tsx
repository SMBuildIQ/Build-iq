import React, { useState } from "react";
import {
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "./ThemeContext";

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  error,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[{ gap: theme.space[2] }, containerStyle]}>
      <Text
        style={{
          fontFamily: "Questrial",
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.76,
          textTransform: "uppercase",
          color: theme.colors.textSecondary,
        }}
      >
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            height: theme.layout.inputHeight,
            paddingHorizontal: theme.space[4],
            borderWidth: theme.stroke.hairline,
            borderColor: error
              ? theme.colors.danger
              : focused
                ? theme.colors.focus
                : theme.colors.borderStrong,
            borderRadius: theme.radius.none,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            fontFamily: "Questrial",
            fontSize: 16,
            letterSpacing: 0.16,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text
          style={{
            fontFamily: "Questrial",
            fontSize: 13,
            color: theme.colors.danger,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
