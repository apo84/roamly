import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { addVideoToCollection, ApiError, listInspiration } from "../lib/api/inspiration";
import { displaySocialText } from "../lib/htmlEntities";
import type { CollectionItemRow, InspirationListItem } from "../types/inspiration";
import { colors, fonts, platformColors, radius } from "../theme";

type Props = {
  visible: boolean;
  collectionId: string;
  existingVideoIds: string[];
  onClose: () => void;
  onAdded: (item: CollectionItemRow) => void;
};

export function PickLibraryClipModal({ visible, collectionId, existingVideoIds, onClose, onAdded }: Props) {
  const insets = useSafeAreaInsets();
  const exclude = useMemo(() => new Set(existingVideoIds), [existingVideoIds]);
  const [library, setLibrary] = useState<InspirationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listInspiration();
      setLibrary(rows);
    } catch (e) {
      setLibrary([]);
      setError(e instanceof ApiError ? e.message : "Could not load your Inspo library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const available = useMemo(() => library.filter((x) => !exclude.has(x.video.id)), [library, exclude]);

  async function addClip(item: InspirationListItem) {
    setAddingId(item.video.id);
    setError(null);
    try {
      const row = await addVideoToCollection(collectionId, item.video.id);
      onAdded(row);
      onClose();
    } catch (e) {
      const msg =
        e instanceof ApiError && e.code === "ALREADY_IN_COLLECTION"
          ? "Already in this collection."
          : e instanceof ApiError
            ? e.message
            : "Could not add clip";
      setError(msg);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => pressed && styles.closePressed}>
            <Text style={styles.closeLabel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Add from Inspo</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <Text style={styles.subtitle}>Clips already in this collection are hidden.</Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : available.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing to add</Text>
            <Text style={styles.emptyBody}>
              {library.length === 0
                ? "Save clips from the Inspo tab first."
                : "Every saved clip is already in this collection."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={available}
            keyExtractor={(item) => item.video.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const busy = addingId === item.video.id;
              const platformBg = platformColors[item.video.platform];
              const thumbnail =
                item.video.thumbnail_url || item.video.canonical_url || item.video.video_url || undefined;
              return (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => void addClip(item)}
                  disabled={busy || !!addingId}
                >
                  {thumbnail ? (
                    <Image source={{ uri: thumbnail }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPh]} />
                  )}
                  <View style={styles.rowBody}>
                    <View style={[styles.badge, { backgroundColor: platformBg }]}>
                      <Text style={styles.badgeText}>{item.video.platform}</Text>
                    </View>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {displaySocialText(item.video.title)}
                    </Text>
                  </View>
                  {busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="add-circle" size={26} color={colors.primary} />}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  closePressed: {
    opacity: 0.7,
  },
  closeLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.teal,
    minWidth: 56,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.foreground,
  },
  topBarSpacer: {
    width: 56,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
  },
  center: {
    paddingTop: 48,
    alignItems: "center",
  },
  empty: {
    paddingTop: 32,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.foreground,
  },
  emptyBody: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  list: {
    paddingBottom: 24,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    opacity: 0.92,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  thumbPh: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBody: {
    flex: 1,
    gap: 6,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: colors.primaryForeground,
    fontFamily: fonts.sansBold,
    fontSize: 10,
  },
  rowTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 19,
  },
});
