import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { findCollectionById } from "../../../data/passportStamps";
import { colors, fonts, radius } from "../../../theme";

export default function CollectionSpotlightScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const cid = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
  const collection = cid ? findCollectionById(cid) : undefined;

  if (!collection) {
    return (
      <View style={styles.screen}>
        <Stack.Screen
          options={{ title: "Collection", headerShown: true, headerStyle: { backgroundColor: colors.background } }}
        />
        <Text style={styles.title}>Not in spotlight library</Text>
        <Text style={styles.body}>Open Collections for your saved lists.</Text>
        <Pressable style={styles.btn} onPress={() => router.push("/(tabs)/collections")}>
          <Text style={styles.btnText}>Go to Collections</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Collection",
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: fonts.sansBold, fontSize: 17 },
        }}
      />
      <View style={styles.screen}>
      <View style={styles.card}>
        <Image source={{ uri: collection.coverImage }} style={styles.cover} contentFit="cover" />
        <View style={styles.cardBody}>
          <Text style={styles.name}>{collection.name}</Text>
          <Text style={styles.meta}>
            {collection.city}, {collection.country} · {collection.videoCount} videos
          </Text>
          <Text style={styles.lead}>Curated set from the demo library. Explore to add more inspo.</Text>
          <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={() => router.push("/(tabs)/explore")}>
            <Text style={styles.primaryText}>Explore videos</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.outline, pressed && styles.pressed]} onPress={() => router.push("/(tabs)/collections")}>
            <Text style={styles.outlineText}>Your collections</Text>
          </Pressable>
        </View>
      </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.foreground,
    marginTop: 24,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
    marginTop: 8,
  },
  btn: {
    marginTop: 20,
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
  },
  btnText: {
    fontFamily: fonts.sansBold,
    color: colors.primaryForeground,
    fontSize: 16,
  },
  card: {
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginTop: 8,
  },
  cover: {
    width: "100%",
    height: 200,
    backgroundColor: colors.muted,
  },
  cardBody: {
    padding: 16,
    gap: 10,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.foreground,
  },
  meta: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  lead: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.foreground,
    marginTop: 4,
  },
  primary: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  primaryText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.primaryForeground,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  outlineText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.foreground,
  },
  pressed: {
    opacity: 0.9,
  },
});
