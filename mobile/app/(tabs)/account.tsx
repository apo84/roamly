import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { supabaseConfigured } from "../../lib/supabase";
import { colors, fonts, radius } from "../../theme";

export default function AccountScreen() {
  const router = useRouter();
  const { isAuthenticated, user, isReady, signOut } = useAuth();

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!supabaseConfigured) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>
          Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a .env file in the mobile folder to enable sign
          in.
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Sign in to sync collections, itinerary, and passport across devices.</Text>
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
          onPress={() => router.push("/auth/sign-in")}
        >
          <Text style={styles.primaryText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signed in</Text>
      <Text style={styles.email}>{user?.email ?? user?.id}</Text>
      <Pressable
        style={({ pressed }) => [styles.outline, pressed && styles.outlinePressed]}
        onPress={() => signOut()}
      >
        <Text style={styles.outlineText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
    gap: 16,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.foreground,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.mutedForeground,
  },
  email: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.foreground,
  },
  primary: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.lg,
    marginTop: 8,
  },
  primaryPressed: {
    opacity: 0.92,
  },
  primaryText: {
    fontFamily: fonts.sansBold,
    color: colors.primaryForeground,
    fontSize: 16,
  },
  outline: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.lg,
    marginTop: 8,
    backgroundColor: colors.card,
  },
  outlinePressed: {
    opacity: 0.88,
  },
  outlineText: {
    fontFamily: fonts.sansBold,
    color: colors.foreground,
    fontSize: 16,
  },
});
