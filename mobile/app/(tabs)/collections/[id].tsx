import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PickLibraryClipModal } from "../../../components/PickLibraryClipModal";
import { SignInPrompt } from "../../../components/SignInPrompt";
import { useAuth } from "../../../contexts/AuthContext";
import { displaySocialText } from "../../../lib/htmlEntities";
import { ApiError, formatApiFailure, getCollection } from "../../../lib/api/inspiration";
import type { CollectionDetailPayload, CollectionItemRow } from "../../../types/inspiration";
import { colors, fonts, radius } from "../../../theme";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { isAuthenticated, isReady } = useAuth();
  const [data, setData] = useState<CollectionDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addLibraryOpen, setAddLibraryOpen] = useState(false);

  const collectionId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
  const valid = collectionId && UUID_RE.test(collectionId);

  const load = useCallback(async (isRefresh = false) => {
    if (!valid || !isAuthenticated) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const row = await getCollection(collectionId);
      setData(row);
    } catch (e) {
      setData(null);
      if (__DEV__) {
        console.warn("[collections/[id]] load failed\n", formatApiFailure(e).detail);
      } else if (e instanceof ApiError) {
        console.warn("[collections/[id]]", e.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [collectionId, valid, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  const onClipAdded = useCallback((row: CollectionItemRow) => {
    setData((d) => {
      if (!d) return d;
      const nextItems = [...d.items, row].sort((a, b) => a.position - b.position);
      const thumb = row.video?.thumbnail_url ?? null;
      const cover_image_url = d.collection.cover_image_url ?? thumb;
      return {
        ...d,
        collection: {
          ...d.collection,
          cover_image_url,
          item_count: nextItems.length,
        },
        items: nextItems,
      };
    });
  }, []);

  const existingVideoIds = useMemo(() => data?.items.map((i) => i.video_id) ?? [], [data]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        data ? (
          <Pressable
            onPress={() => setAddLibraryOpen(true)}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            hitSlop={12}
          >
            <Text style={styles.headerBtnLabel}>Add</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, data]);

  if (!isReady) {
    return <View style={styles.container} />;
  }

  if (!isAuthenticated) {
    return <SignInPrompt message="Sign in to view this collection." />;
  }

  if (!valid) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Invalid collection</Text>
        <Text style={styles.subtitle}>This link does not look like a valid collection id.</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Could not load</Text>
        <Text style={styles.subtitle}>Pull to retry or go back.</Text>
      </View>
    );
  }

  const { collection, items } = data;
  const place = [collection.city, collection.country].filter(Boolean).join(", ");

  return (
    <View style={styles.flex}>
      <PickLibraryClipModal
        visible={addLibraryOpen}
        collectionId={collectionId}
        existingVideoIds={existingVideoIds}
        onClose={() => setAddLibraryOpen(false)}
        onAdded={onClipAdded}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{collection.name}</Text>
            {place ? <Text style={styles.place}>{place}</Text> : null}
            {collection.description ? <Text style={styles.desc}>{collection.description}</Text> : null}
            <Text style={styles.count}>
              {collection.item_count === 1 ? "1 clip" : `${collection.item_count} clips`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No clips yet. Tap Add in the header to choose from your Inspo library, or save a new link on the Inspo tab.
          </Text>
        }
        renderItem={({ item }) => (
          <CollectionItemRowView item={item} onPressVideo={(videoId) => router.push(`/(tabs)/inspiration/${videoId}`)} />
        )}
      />
    </View>
  );
}

function CollectionItemRowView({
  item,
  onPressVideo,
}: {
  item: CollectionItemRow;
  onPressVideo: (videoId: string) => void;
}) {
  const v = item.video;
  if (!v?.id) {
    return (
      <View style={styles.row}>
        <Text style={styles.unavailable}>Clip unavailable</Text>
      </View>
    );
  }
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={() => onPressVideo(v.id)}>
      {v.thumbnail_url ? (
        <Image source={{ uri: v.thumbnail_url }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {displaySocialText(v.title)}
        </Text>
        {item.user_note ? (
          <Text style={styles.rowNote} numberOfLines={2}>
            {item.user_note}
          </Text>
        ) : null}
        {v.caption ? (
          <Text style={styles.rowCaption} numberOfLines={2}>
            {displaySocialText(v.caption)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    marginRight: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerBtnPressed: {
    opacity: 0.85,
  },
  headerBtnLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.primary,
  },
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 6,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.foreground,
  },
  place: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.teal,
  },
  desc: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  count: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.mutedForeground,
    marginTop: 8,
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
    lineHeight: 22,
    paddingVertical: 24,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  rowPressed: {
    opacity: 0.9,
  },
  thumb: {
    width: 56,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  thumbPlaceholder: {
    backgroundColor: colors.secondary,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.foreground,
    lineHeight: 22,
  },
  rowCaption: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  rowNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.teal,
    lineHeight: 18,
  },
  unavailable: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    paddingVertical: 8,
  },
});
