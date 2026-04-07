import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { exchangeOAuthCodeOnce } from "../../lib/oauthExchange";
import { supabase, supabaseConfigured } from "../../lib/supabase";
import { colors, fonts, radius } from "../../theme";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signInWithGoogle = useCallback(async () => {
    if (!supabaseConfigured || !supabase) {
      Alert.alert(
        "Not configured",
        "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env",
      );
      return;
    }

    setBusy(true);
    try {
      // Expo Go → exp://HOST:PORT/--/auth/callback (NOT trove://). Dev/standalone builds can use trove:// from app.json scheme.
      const redirectTo = Linking.createURL("auth/callback");
      if (__DEV__) {
        console.warn("[auth] Add this exact string to Supabase → Auth → URL configuration → Redirect URLs:", redirectTo);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error) {
        Alert.alert("Sign in failed", error.message);
        return;
      }

      if (!data.url) {
        Alert.alert("Sign in failed", "No OAuth URL returned.");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success" && result.url) {
        const parsed = new URL(result.url);
        const code = parsed.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await exchangeOAuthCodeOnce(supabase, code);
          if (exchangeError) {
            Alert.alert("Sign in failed", exchangeError.message);
            return;
          }
          router.replace("/(tabs)/account");
          return;
        }
      }

      if (result.type === "cancel") {
        return;
      }

      Alert.alert(
        "Sign in",
        [
          "Supabase only returns to your app if the redirect URL matches exactly.",
          "",
          `Add this URL to Supabase (Authentication → URL configuration → Redirect URLs):`,
          redirectTo,
          "",
          "If it still opens localhost:3000, that Site URL is used when redirect_to is missing or not on the allow list — fix the list first.",
        ].join("\n"),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      Alert.alert("Sign in error", message);
    } finally {
      setBusy(false);
    }
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.lead}>Use the same Google account as the Trove web app (if you use it there).</Text>
      <Text style={styles.hint}>
        Add the exact redirect below under Authentication → Redirect URLs. (Expo Go uses <Text style={styles.mono}>exp://…</Text>{" "}
        , not <Text style={styles.mono}>trove://</Text> until a dev build.){"\n\n"}
        Keep <Text style={styles.mono}>Site URL</Text> as your real web app (e.g. Vercel or localhost web), not{" "}
        <Text style={styles.mono}>exp://</Text> — Site URL is only a fallback when redirect_to is invalid.{"\n\n"}
        Redirect URL for this run:{"\n"}
        <Text style={styles.mono}>{Linking.createURL("auth/callback")}</Text>
      </Text>

      <Pressable
        style={({ pressed }) => [styles.button, (pressed || busy) && styles.buttonPressed]}
        onPress={signInWithGoogle}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={styles.buttonText}>Continue with Google</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 20,
    backgroundColor: colors.background,
  },
  lead: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.foreground,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 12,
    color: colors.navy,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    fontFamily: fonts.sansBold,
    color: colors.primaryForeground,
    fontSize: 17,
  },
});
