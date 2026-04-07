import { Stack } from "expo-router";

import { colors, fonts } from "../../../theme";

export default function CollectionsLayout() {
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
      <Stack.Screen name="index" options={{ title: "Collections" }} />
      <Stack.Screen name="new" options={{ title: "New collection" }} />
      <Stack.Screen name="[id]" options={{ title: "Collection" }} />
    </Stack>
  );
}
