import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { findVideoById } from "../../data/passportStamps";
import { displaySocialText } from "../../lib/htmlEntities";
import { colors, fonts, platformColors, radius } from "../../theme";
import { formatCount } from "../../utils/format";

export default function ClipPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const videoId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
  const video = videoId ? findVideoById(videoId) : undefined;

  if (!video) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: "Clip", headerShown: true, headerStyle: { backgroundColor: colors.background } }} />
        <Text style={styles.missTitle}>Clip not found</Text>
        <Text style={styles.missBody}>This id isn&apos;t in the local library.</Text>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const loc = video.locations[0];
  const platformBg = platformColors[video.platform];

  return (
    <>
      <Stack.Screen
        options={{
          title: "Inspo clip",
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: fonts.sansBold, fontSize: 17 },
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={{ uri: video.thumbnail }} style={styles.thumb} contentFit="cover" />
        <View style={[styles.platformBadge, { backgroundColor: platformBg }]}>
          <Text style={styles.platformText}>{video.platform}</Text>
        </View>
      </View>
      <Text style={styles.title}>{displaySocialText(video.title)}</Text>
      <Text style={styles.caption}>{displaySocialText(video.caption)}</Text>
      <Text style={styles.meta}>
        ♥ {formatCount(video.likes)} · {formatCount(video.views)} views · @{video.creator}
      </Text>
      {loc ? (
        <Text style={styles.loc}>
          📍 {loc.name} · {loc.city}, {loc.country}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]} onPress={() => router.push("/(tabs)/map")}>
          <Text style={styles.primaryBtnText}>Open map</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]} onPress={() => router.push("/(tabs)/explore")}>
          <Text style={styles.outlineBtnText}>Explore more</Text>
        </Pressable>
      </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  missTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.foreground,
    marginTop: 24,
    textAlign: "center",
  },
  missBody: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 24,
  },
  btn: {
    marginTop: 20,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
  },
  btnText: {
    fontFamily: fonts.sansBold,
    color: colors.primaryForeground,
    fontSize: 16,
  },
  hero: {
    position: "relative",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: colors.muted,
  },
  platformBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  platformText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: "#fff",
    textTransform: "lowercase",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.foreground,
    marginHorizontal: 16,
    marginTop: 16,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.foreground,
    marginHorizontal: 16,
    marginTop: 10,
  },
  meta: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
    marginHorizontal: 16,
    marginTop: 12,
  },
  loc: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.teal,
    marginHorizontal: 16,
    marginTop: 8,
  },
  actions: {
    marginHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  primaryBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.primaryForeground,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  outlineBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.foreground,
  },
  pressed: {
    opacity: 0.9,
  },
});
