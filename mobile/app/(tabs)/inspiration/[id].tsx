import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PickCollectionModal } from "../../../components/PickCollectionModal";
import { SignInPrompt } from "../../../components/SignInPrompt";
import { useAuth } from "../../../contexts/AuthContext";
import { ApiError, getInspiration, patchInspiration, removeInspiration } from "../../../lib/api/inspiration";
import { displaySocialText } from "../../../lib/htmlEntities";
import type { InspirationDetail } from "../../../types/inspiration";
import { colors, fonts, radius } from "../../../theme";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Detail shell for one saved video (param = `videos.id`). Agent 6 loads data and adds open/remove actions.
 */
export default function InspirationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const [data, setData] = useState<InspirationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [placeLabel, setPlaceLabel] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [savingPlace, setSavingPlace] = useState(false);
  const [pickCollectionOpen, setPickCollectionOpen] = useState(false);

  if (!isReady) {
    return <View style={styles.container} />;
  }

  if (!isAuthenticated) {
    return <SignInPrompt message="Sign in to view this saved clip." />;
  }

  const videoId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
  const valid = videoId && UUID_RE.test(videoId);

  const load = useCallback(async () => {
    if (!valid) return;
    setLoading(true);
    try {
      const row = await getInspiration(videoId);
      setData(row);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load saved clip";
      Alert.alert("Load failed", msg);
    } finally {
      setLoading(false);
    }
  }, [videoId, valid]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!valid) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Invalid link</Text>
        <Text style={styles.subtitle}>This detail URL does not look like a valid saved item id.</Text>
      </View>
    );
  }

  const openUrl = useMemo(
    () => data?.video.video_url ?? data?.video.canonical_url ?? null,
    [data?.video.video_url, data?.video.canonical_url],
  );

  async function onDelete() {
    try {
      await removeInspiration(videoId);
      Alert.alert("Removed", "This link was removed from your library.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not remove save";
      Alert.alert("Delete failed", msg);
      return;
    }
  }

  async function onAttachPlace() {
    if (!placeLabel.trim() || !lat.trim() || !lng.trim()) {
      Alert.alert("Missing fields", "Enter place name, latitude, and longitude.");
      return;
    }
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) {
      Alert.alert("Invalid coordinates", "Latitude and longitude must be numbers.");
      return;
    }
    setSavingPlace(true);
    try {
      await patchInspiration(videoId, {
        placeLabel: placeLabel.trim(),
        lat: nLat,
        lng: nLng,
      });
      Alert.alert("Place set", "Location attached to one of your collection items for this save.");
      await load();
      setPlaceLabel("");
      setLat("");
      setLng("");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to attach place";
      Alert.alert("Set place failed", msg);
    } finally {
      setSavingPlace(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PickCollectionModal
        visible={pickCollectionOpen}
        videoId={valid ? videoId : null}
        onClose={() => setPickCollectionOpen(false)}
        onAdded={() => {
          void load();
        }}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : data ? (
        <>
          <Text style={styles.title}>{displaySocialText(data.video.title)}</Text>
          <Text style={styles.meta}>{data.video.platform}</Text>
          {data.video.caption ? (
            <Text style={styles.caption}>{displaySocialText(data.video.caption)}</Text>
          ) : null}
          {typeof data.video.like_count === "number" || typeof data.video.comment_count === "number" ? (
            <Text style={styles.stats}>
              {typeof data.video.like_count === "number" ? `♥ ${data.video.like_count}` : ""}
              {typeof data.video.like_count === "number" && typeof data.video.comment_count === "number" ? " · " : ""}
              {typeof data.video.comment_count === "number" ? `💬 ${data.video.comment_count}` : ""}
            </Text>
          ) : null}
          <Text style={styles.subtitle}>{data.savedLink.userNote || "No note saved yet."}</Text>

          <Pressable style={({ pressed }) => [styles.addCollectionBtn, pressed && styles.addCollectionBtnPressed]} onPress={() => setPickCollectionOpen(true)}>
            <Text style={styles.addCollectionBtnText}>Add to collection</Text>
          </Pressable>

          {!!data.collectionItems.length ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Collection context</Text>
              {data.collectionItems.map((item) => (
                <View key={item.id} style={styles.collectionRow}>
                  <Text style={styles.collectionNote}>{item.userNote || "No collection note"}</Text>
                  <Text style={styles.collectionMeta}>
                    {item.visitStart || "No start"} → {item.visitEnd || "No end"}
                  </Text>
                  {item.location ? (
                    <Text style={styles.collectionMeta}>
                      {item.location.name} ({item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)})
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Set place (Agent 8)</Text>
            <TextInput style={styles.input} placeholder="Place label" value={placeLabel} onChangeText={setPlaceLabel} />
            <View style={styles.coordRow}>
              <TextInput style={[styles.input, styles.coord]} placeholder="Lat" value={lat} onChangeText={setLat} keyboardType="numeric" />
              <TextInput style={[styles.input, styles.coord]} placeholder="Lng" value={lng} onChangeText={setLng} keyboardType="numeric" />
            </View>
            <Pressable style={({ pressed }) => [styles.primaryBtn, (pressed || savingPlace) && styles.primaryBtnPressed]} onPress={onAttachPlace}>
              <Text style={styles.primaryBtnText}>{savingPlace ? "Saving..." : "Set place"}</Text>
            </Pressable>
          </View>

          {openUrl ? (
            <Pressable style={({ pressed }) => [styles.outlineBtn, pressed && styles.outlineBtnPressed]} onPress={() => Linking.openURL(openUrl)}>
              <Text style={styles.outlineBtnText}>Open original link</Text>
            </Pressable>
          ) : null}
          <Pressable style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]} onPress={onDelete}>
            <Text style={styles.deleteBtnText}>Remove save</Text>
          </Pressable>
          <Text style={styles.mono} selectable>
            {videoId}
          </Text>
        </>
      ) : (
        <Text style={styles.subtitle}>No data found.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    gap: 12,
    paddingBottom: 40,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.mutedForeground,
    lineHeight: 24,
  },
  addCollectionBtn: {
    marginTop: 4,
    marginBottom: 8,
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.teal,
  },
  addCollectionBtnPressed: {
    opacity: 0.92,
  },
  addCollectionBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.primaryForeground,
  },
  meta: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.teal,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 22,
    marginTop: 4,
  },
  stats: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  block: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: 12,
    gap: 8,
  },
  blockTitle: {
    fontFamily: fonts.sansBold,
    color: colors.foreground,
    fontSize: 14,
  },
  collectionRow: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  collectionNote: {
    fontFamily: fonts.sansMedium,
    color: colors.foreground,
  },
  collectionMeta: {
    fontFamily: fonts.sans,
    color: colors.mutedForeground,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    fontFamily: fonts.sans,
    color: colors.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  coordRow: {
    flexDirection: "row",
    gap: 8,
  },
  coord: {
    flex: 1,
  },
  primaryBtn: {
    borderRadius: radius.lg,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  primaryBtnPressed: {
    opacity: 0.92,
  },
  primaryBtnText: {
    color: colors.primaryForeground,
    fontFamily: fonts.sansBold,
    fontSize: 15,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 12,
    alignItems: "center",
  },
  outlineBtnPressed: {
    opacity: 0.9,
  },
  outlineBtnText: {
    color: colors.foreground,
    fontFamily: fonts.sansBold,
    fontSize: 15,
  },
  deleteBtn: {
    backgroundColor: colors.destructive,
    borderRadius: radius.lg,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteBtnPressed: {
    opacity: 0.9,
  },
  deleteBtnText: {
    color: colors.primaryForeground,
    fontFamily: fonts.sansBold,
    fontSize: 15,
  },
  mono: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.foreground,
    marginTop: 4,
  },
});
