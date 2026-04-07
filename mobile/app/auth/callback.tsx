import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { exchangeOAuthCodeOnce } from "../../lib/oauthExchange";
import { supabase, supabaseConfigured } from "../../lib/supabase";
import { colors, fonts } from "../../theme";

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return null;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const [message, setMessage] = useState("Completing sign in…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      if (!supabaseConfigured || !supabase) {
        if (!cancelled) {
          setMessage("Supabase is not configured.");
          router.replace("/auth/sign-in");
        }
        return;
      }

      const paramError = firstParam(params.error);
      if (paramError) {
        if (!cancelled) {
          setMessage(`Error: ${paramError}`);
          setTimeout(() => router.replace("/auth/sign-in"), 2500);
        }
        return;
      }

      let code = firstParam(params.code);

      if (!code) {
        const initial = await Linking.getInitialURL();
        if (initial) {
          try {
            code = new URL(initial).searchParams.get("code");
          } catch {
            // ignore
          }
        }
      }

      if (code) {
        const { error } = await exchangeOAuthCodeOnce(supabase, code);
        if (error) {
          if (!cancelled) setMessage(error.message);
        } else if (!cancelled) {
          router.replace("/(tabs)/account");
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled && session) {
        router.replace("/(tabs)/account");
        return;
      }

      if (!cancelled) {
        setMessage("No session found. Return to sign in and try again.");
        setTimeout(() => router.replace("/auth/sign-in"), 2000);
      }
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.error, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
    backgroundColor: colors.background,
  },
  text: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: "center",
  },
});
