import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { PickCollectionModal } from "../../../components/PickCollectionModal";
import { SignInPrompt } from "../../../components/SignInPrompt";
import { useAuth } from "../../../contexts/AuthContext";
import { ApiError, formatApiFailure, listInspiration, removeInspiration } from "../../../lib/api/inspiration";
import { displaySocialText } from "../../../lib/htmlEntities";
import type { InspirationListItem } from "../../../types/inspiration";
import { colors, fonts, platformColors, radius } from "../../../theme";

export default function InspirationLibraryScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const [items, setItems] = useState<InspirationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pickVideoId, setPickVideoId] = useState<string | null>(null);

  function confirmRemove(item: InspirationListItem) {
    Alert.alert("Remove clip?", "It will leave your library. Clips may still appear inside collections until you remove them there too.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await removeInspiration(item.video.id);
              setItems((prev) => prev.filter((x) => x.video.id !== item.video.id));
            } catch (e) {
              const msg = e instanceof ApiError ? e.message : "Could not remove";
              Alert.alert("Remove failed", msg);
            }
          })();
        },
      },
    ]);
  }

  const load = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await listInspiration();
      setItems(data);
    } catch (e) {
      setItems([]);
      if (!isRefresh) {
        if (__DEV__) {
          console.warn("[inspiration/index] load failed\n", formatApiFailure(e).detail);
        } else {
          const msg = e instanceof ApiError ? e.message : "Failed to load inspiration library";
          console.warn("[inspiration/index]", msg);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isAuthenticated
        ? () => (
            <Pressable
              onPress={() => router.push("/(tabs)/inspiration/add")}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
              hitSlop={12}
            >
              <Text style={styles.headerBtnLabel}>Add</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, router, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  if (!isReady) {
    return <View style={styles.screen} />;
  }

  if (!isAuthenticated) {
    return (
      <SignInPrompt message="Sign in to save travel links and see them in your Inspo library." />
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <PickCollectionModal
        visible={pickVideoId !== null}
        videoId={pickVideoId}
        onClose={() => setPickVideoId(null)}
        onAdded={(name) => {
          Alert.alert("Added to collection", `“${name}” now includes this clip.`);
          void load(true);
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.video.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.h1}>Your inspo</Text>
            <Text style={styles.lead}>
              Everything you have saved lives here in one place — open a clip for details, or remove it from your library when you are done with it.
            </Text>
            {items.length > 0 ? (
              <Text style={styles.countLine}>
                {items.length} {items.length === 1 ? "clip" : "clips"} saved
              </Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No saved links yet</Text>
            <Text style={styles.emptySubtitle}>Tap Add to paste a link — we will pull the preview and keep it here.</Text>
            <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]} onPress={() => router.push("/(tabs)/inspiration/add")}>
              <Text style={styles.primaryBtnText}>Add a link</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const platformBg = platformColors[item.video.platform];
          const thumbnail = item.video.thumbnail_url || item.video.canonical_url || item.video.video_url || undefined;
          return (
            <View style={styles.row}>
              <Pressable
                style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
                onPress={() => router.push(`/(tabs)/inspiration/${item.video.id}`)}
              >
                {thumbnail ? <Image source={{ uri: thumbnail }} style={styles.thumb} contentFit="cover" /> : <View style={[styles.thumb, styles.thumbFallback]} />}
                <View style={styles.rowBody}>
                  <View style={[styles.platformBadge, { backgroundColor: platformBg }]}>
                    <Text style={styles.platformText}>{item.video.platform}</Text>
                  </View>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {displaySocialText(item.video.title)}
                  </Text>
                  <Text style={styles.rowNote} numberOfLines={1}>
                    {item.libraryNote || item.collectionItem?.userNote || "No note yet"}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                onPress={() => setPickVideoId(item.video.id)}
                accessibilityLabel="Add to collection"
                hitSlop={10}
              >
                <Ionicons name="folder-outline" size={22} color={colors.teal} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.iconBtn, pressed && styles.removeBtnPressed]}
                onPress={() => confirmRemove(item)}
                accessibilityLabel="Remove from library"
                hitSlop={10}
              >
                <Ionicons name="trash-outline" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 10,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.foreground,
    marginBottom: 8,
  },
  lead: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
    lineHeight: 22,
    marginBottom: 12,
  },
  countLine: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.teal,
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.sansBold,
    color: colors.foreground,
    fontSize: 16,
  },
  emptySubtitle: {
    fontFamily: fonts.sans,
    color: colors.mutedForeground,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  primaryBtnPressed: {
    opacity: 0.92,
  },
  primaryBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.primaryForeground,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  rowPressed: {
    opacity: 0.92,
  },
  iconBtn: {
    padding: 10,
    justifyContent: "center",
  },
  iconBtnPressed: {
    opacity: 0.7,
  },
  removeBtnPressed: {
    opacity: 0.65,
  },
  thumb: {
    width: 78,
    height: 78,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  thumbFallback: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBody: {
    flex: 1,
    gap: 6,
  },
  platformBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  platformText: {
    color: colors.primaryForeground,
    fontFamily: fonts.sansBold,
    fontSize: 10,
  },
  rowTitle: {
    fontFamily: fonts.sansBold,
    color: colors.foreground,
    fontSize: 15,
    lineHeight: 20,
  },
  rowNote: {
    fontFamily: fonts.sans,
    color: colors.mutedForeground,
    fontSize: 13,
  },
  headerBtn: {
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerBtnPressed: {
    opacity: 0.7,
  },
  headerBtnLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.primary,
  },
});
