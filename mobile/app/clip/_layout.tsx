import { Stack } from "expo-router";

import { colors, fonts } from "../../theme";

export default function ClipStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: fonts.sansBold, fontSize: 17 },
      }}
    />
  );
}
