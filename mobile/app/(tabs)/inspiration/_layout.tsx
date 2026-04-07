import { Stack } from "expo-router";

import { colors, fonts } from "../../../theme";

export default function InspirationLayout() {
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
      <Stack.Screen name="index" options={{ title: "Inspo" }} />
      <Stack.Screen name="add" options={{ title: "Add link" }} />
      <Stack.Screen name="[id]" options={{ title: "Saved clip" }} />
    </Stack>
  );
}
