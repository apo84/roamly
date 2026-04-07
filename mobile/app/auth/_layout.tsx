import { Stack } from "expo-router";

import { colors, fonts } from "../../theme";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: colors.foreground,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: fonts.sansBold, color: colors.foreground },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="sign-in" options={{ title: "Sign in", presentation: "modal" }} />
      <Stack.Screen name="callback" options={{ title: "Signing in…", headerBackVisible: false }} />
    </Stack>
  );
}
