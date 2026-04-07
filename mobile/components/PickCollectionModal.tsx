import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
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

import { addVideoToCollection, ApiError, listCollections } from "../lib/api/inspiration";
import type { CollectionSummary } from "../types/inspiration";
import { colors, fonts, radius } from "../theme";

type Props = {
  visible: boolean;
  videoId: string | null;
  onClose: () => void;
  onAdded?: (collectionName: string) => void;
};

export function PickCollectionModal({ visible, videoId, onClose, onAdded }: Props) {
  const insets = useSafeAreaInsets();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listCollections();
      setCollections(rows);
    } catch (e) {
      setCollections([]);
      setError(e instanceof ApiError ? e.message : "Could not load collections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && videoId) void load();
  }, [visible, videoId, load]);

  async function pickCollection(c: CollectionSummary) {
    if (!videoId) return;
    setAddingId(c.id);
    setError(null);
    try {
      await addVideoToCollection(c.id, videoId);
      onAdded?.(c.name);
      onClose();
    } catch (e) {
      const msg =
        e instanceof ApiError && e.code === "ALREADY_IN_COLLECTION"
          ? "That clip is already in this collection."
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
          <Text style={styles.title}>Add to collection</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <Text style={styles.subtitle}>Choose a trip bucket. The clip stays in your Inspo library too.</Text>

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
        ) : collections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No collections yet</Text>
            <Text style={styles.emptyBody}>Create one from the Collections tab, then try again.</Text>
          </View>
        ) : (
          <FlatList
            data={collections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const busy = addingId === item.id;
              const place = [item.city, item.country].filter(Boolean).join(", ");
              return (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => void pickCollection(item)}
                  disabled={busy || !!addingId}
                >
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {place ? (
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {place}
                      </Text>
                    ) : null}
                    <Text style={styles.rowMeta}>
                      {item.item_count === 1 ? "1 clip" : `${item.item_count} clips`}
                    </Text>
                  </View>
                  {busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />}
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
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.foreground,
  },
  rowMeta: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
