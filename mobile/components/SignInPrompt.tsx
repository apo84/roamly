import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius } from "../theme";

export function SignInPrompt({ message }: { message: string }) {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => router.push("/auth/sign-in")}
      >
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
    backgroundColor: colors.background,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonText: {
    fontFamily: fonts.sansBold,
    color: colors.primaryForeground,
    fontSize: 16,
  },
});
