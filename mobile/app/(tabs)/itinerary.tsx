import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SignInPrompt } from "../../components/SignInPrompt";
import { useAuth } from "../../contexts/AuthContext";
import {
  ApiError,
  formatApiFailure,
  getCollection,
  listCollections,
  patchCollectionItem,
} from "../../lib/api/inspiration";
import { displaySocialText } from "../../lib/htmlEntities";
import type { CollectionDetailPayload, CollectionItemRow, CollectionSummary } from "../../types/inspiration";
import { colors, fonts, platformColors, radius } from "../../theme";

const WIN_W = Dimensions.get("window").width;
const PAGE_PAD = 16;
const GRID_GAP = 10;
const CARD_W = (WIN_W - PAGE_PAD * 2 - GRID_GAP) / 2;
const CARD_H = CARD_W * 1.38;

export default function ItineraryScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CollectionDetailPayload | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalItem, setModalItem] = useState<CollectionItemRow | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) return;
    if (isRefresh) setRefreshing(true);
    else setLoadingList(true);
    try {
      const rows = await listCollections();
      setCollections(rows);
      setSelectedId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (e) {
      setCollections([]);
      if (__DEV__) {
        console.warn("[itinerary] load failed\n", formatApiFailure(e).detail);
      } else if (e instanceof ApiError) {
        console.warn("[itinerary]", e.message);
      }
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  const loadDetail = useCallback(
    async (collectionId: string) => {
      if (!isAuthenticated || !collectionId) return;
      setLoadingDetail(true);
      try {
        const row = await getCollection(collectionId);
        setDetail(row);
      } catch (e) {
        setDetail(null);
        if (__DEV__) {
          console.warn("[itinerary] detail failed\n", formatApiFailure(e).detail);
        }
      } finally {
        setLoadingDetail(false);
      }
    },
    [isAuthenticated],
  );

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) void loadList(false);
    }, [loadList, isAuthenticated]),
  );

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const selectedCollection = useMemo(
    () => collections.find((c) => c.id === selectedId) ?? null,
    [collections, selectedId],
  );

  const placeLabel = useMemo(() => {
    if (!selectedCollection) return "";
    return [selectedCollection.city, selectedCollection.country].filter(Boolean).join(", ");
  }, [selectedCollection]);

  function openEditor(item: CollectionItemRow) {
    setModalItem(item);
    setDraftNote(item.user_note ?? "");
    setDraftStart(item.visit_start ?? "");
    setDraftEnd(item.visit_end ?? "");
  }

  async function saveEditor() {
    if (!modalItem || !selectedId) return;
    setSaving(true);
    try {
      const updated = await patchCollectionItem(selectedId, modalItem.id, {
        user_note: draftNote.trim() || null,
        visit_start: draftStart.trim() || null,
        visit_end: draftEnd.trim() || null,
      });
      setDetail((d) => {
        if (!d) return d;
        return { ...d, items: d.items.map((it) => (it.id === updated.id ? updated : it)) };
      });
      setModalItem(null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not save";
      Alert.alert("Save failed", msg);
    } finally {
      setSaving(false);
    }
  }

  if (!isReady) {
    return <View style={styles.screen} />;
  }

  if (!isAuthenticated) {
    return (
      <SignInPrompt message="Sign in to plan trips from your collections — visualize clips, notes, and dates in one studio." />
    );
  }

  if (loadingList && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={detail?.items ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        contentContainerStyle={[styles.gridContent, { paddingBottom: 24 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadList(true)} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.eyebrow}>Trip studio</Text>
            <Text style={styles.h1}>Shape the journey</Text>
            <Text style={styles.lead}>
              Pick a collection, scan clips at a glance, and add trip notes on each thumbnail. Your ideas stay on the clip — perfect for “maybe
              lunch here” or “day 2 backup plan”.
            </Text>

            {collections.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No collections yet</Text>
                <Text style={styles.emptyBody}>
                  Create a bucket on Collections, save Inspo links into it, then come back here to storyboard the trip.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryPressed]}
                  onPress={() => router.push("/(tabs)/collections/new")}
                >
                  <Text style={styles.primaryBtnText}>New collection</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.textLink, pressed && styles.textLinkPressed]} onPress={() => router.push("/(tabs)/collections")}>
                  <Text style={styles.textLinkLabel}>Browse Collections</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.toolbarRow}>
                  <Text style={styles.sectionLabel}>Collection</Text>
                  <Pressable
                    style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
                    onPress={() => router.push("/(tabs)/collections")}
                  >
                    <Text style={styles.ghostBtnText}>Manage</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.teal} />
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                  style={styles.chipsScroll}
                >
                  {collections.map((c) => {
                    const active = c.id === selectedId;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setSelectedId(c.id)}
                        style={({ pressed }) => [
                          styles.chip,
                          active && styles.chipActive,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={[styles.chipMeta, active && styles.chipMetaActive]}>
                          {c.item_count === 1 ? "1 clip" : `${c.item_count} clips`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {selectedCollection ? (
                  <View style={styles.activeMeta}>
                    {placeLabel ? <Text style={styles.placeLine}>{placeLabel}</Text> : null}
                    {selectedCollection.description ? (
                      <Text style={styles.descLine} numberOfLines={2}>
                        {selectedCollection.description}
                      </Text>
                    ) : null}
                    <Text style={styles.hintLine}>Tap a card to add or edit trip notes — they show on the thumbnail overlay.</Text>
                  </View>
                ) : null}

                {loadingDetail ? (
                  <View style={styles.detailLoading}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.detailLoadingText}>Loading clips…</Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
        }
        ListEmptyComponent={() =>
          collections.length > 0 && !loadingDetail && selectedId ? (
            <View style={styles.gridEmpty}>
              <Ionicons name="images-outline" size={40} color={colors.mutedForeground} />
              <Text style={styles.gridEmptyTitle}>No clips in this collection</Text>
              <Text style={styles.gridEmptyBody}>Save links from the Inspo tab and attach this bucket to see them here.</Text>
            </View>
          ) : (
            <></>
          )
        }
        renderItem={({ item }) => (
          <TripClipCard item={item} onPress={() => openEditor(item)} />
        )}
      />

      <Modal visible={modalItem !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalItem(null)}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={insets.top}
        >
          <View style={[styles.modalHeader, { paddingTop: 12 + insets.top }]}>
            <Pressable onPress={() => setModalItem(null)} hitSlop={12} style={({ pressed }) => pressed && styles.modalHeaderBtnPressed}>
              <Text style={styles.modalCancel}>Close</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Trip note</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} keyboardShouldPersistTaps="handled">
            {modalItem?.video ? (
              <>
                {modalItem.video.thumbnail_url ? (
                  <Image source={{ uri: modalItem.video.thumbnail_url }} style={styles.modalImage} contentFit="cover" />
                ) : (
                  <View style={[styles.modalImage, styles.modalImageFallback]} />
                )}
                <Text style={styles.modalVideoTitle} numberOfLines={3}>
                  {displaySocialText(modalItem.video.title)}
                </Text>
                {modalItem.video.platform ? (
                  <View
                    style={[
                      styles.platformPill,
                      { backgroundColor: platformColors[modalItem.video.platform as keyof typeof platformColors] ?? colors.navy },
                    ]}
                  >
                    <Text style={styles.platformPillText}>{modalItem.video.platform}</Text>
                  </View>
                ) : null}
              </>
            ) : null}

            <Text style={styles.fieldLabel}>What do you want to remember?</Text>
            <TextInput
              style={styles.noteInput}
              multiline
              placeholder="e.g. Sunset spot · backup if rain · ask about rooftop"
              placeholderTextColor={colors.mutedForeground}
              value={draftNote}
              onChangeText={setDraftNote}
            />

            <Text style={styles.fieldLabel}>Optional window (YYYY-MM-DD)</Text>
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.dateInput, styles.dateInputFlex]}
                placeholder="Start"
                placeholderTextColor={colors.mutedForeground}
                value={draftStart}
                onChangeText={setDraftStart}
                autoCapitalize="none"
              />
              <Text style={styles.dateArrow}>→</Text>
              <TextInput
                style={[styles.dateInput, styles.dateInputFlex]}
                placeholder="End"
                placeholderTextColor={colors.mutedForeground}
                value={draftEnd}
                onChangeText={setDraftEnd}
                autoCapitalize="none"
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.saveBtn, (pressed || saving) && styles.saveBtnPressed]}
              onPress={() => void saveEditor()}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save trip note"}</Text>
            </Pressable>

            {modalItem?.video?.id ? (
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
                onPress={() => {
                  const vid = modalItem.video?.id;
                  setModalItem(null);
                  if (vid) router.push(`/(tabs)/inspiration/${vid}`);
                }}
              >
                <Text style={styles.secondaryBtnText}>Open full clip</Text>
                <Ionicons name="open-outline" size={18} color={colors.teal} />
              </Pressable>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function TripClipCard({ item, onPress }: { item: CollectionItemRow; onPress: () => void }) {
  const v = item.video;
  const thumb = v?.thumbnail_url ?? undefined;
  const overlayText = item.user_note?.trim() || (v?.caption ? displaySocialText(v.caption).slice(0, 80) : "") || "Tap to add a trip note";
  const platform = v?.platform as keyof typeof platformColors | undefined;
  const badgeColor = platform ? platformColors[platform] ?? colors.navy : colors.navy;

  if (!v?.id) {
    return (
      <View style={[styles.card, styles.cardUnavailable]}>
        <Text style={styles.cardUnavailableText}>Unavailable</Text>
      </View>
    );
  }

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      {thumb ? <Image source={{ uri: thumb }} style={styles.cardImage} contentFit="cover" /> : <View style={[styles.cardImage, styles.cardImagePh]} />}
      <View style={styles.cardScrim} pointerEvents="none">
        <View style={styles.cardScrimFill} />
      </View>
      <View style={styles.cardTopRow} pointerEvents="none">
        <View style={[styles.orderBadge, { borderColor: badgeColor }]}>
          <Text style={styles.orderBadgeText}>{item.position + 1}</Text>
        </View>
        {platform ? (
          <View style={[styles.miniPlatform, { backgroundColor: badgeColor }]}>
            <Text style={styles.miniPlatformText}>{platform}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardFooter} pointerEvents="none">
        <Text style={styles.cardOverlayTitle} numberOfLines={2}>
          {displaySocialText(v.title)}
        </Text>
        <Text style={[styles.cardOverlayNote, item.user_note?.trim() ? styles.cardOverlayNoteEmphasis : null]} numberOfLines={3}>
          {overlayText}
        </Text>
        {item.visit_start || item.visit_end ? (
          <Text style={styles.cardDates} numberOfLines={1}>
            {[item.visit_start, item.visit_end].filter(Boolean).join(" → ")}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  headerBlock: {
    paddingHorizontal: PAGE_PAD,
    paddingTop: 8,
    paddingBottom: 16,
  },
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.teal,
    marginBottom: 6,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.foreground,
    marginBottom: 10,
  },
  lead: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
    lineHeight: 23,
    marginBottom: 20,
  },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.foreground,
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  ghostBtnPressed: {
    opacity: 0.8,
  },
  ghostBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.teal,
  },
  chipsScroll: {
    marginHorizontal: -PAGE_PAD,
    marginBottom: 16,
  },
  chipsRow: {
    paddingHorizontal: PAGE_PAD,
    gap: 10,
    flexDirection: "row",
    alignItems: "stretch",
  },
  chip: {
    maxWidth: WIN_W * 0.72,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  chipPressed: {
    opacity: 0.92,
  },
  chipText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.foreground,
    marginBottom: 2,
  },
  chipTextActive: {
    color: colors.cream,
  },
  chipMeta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  chipMetaActive: {
    color: "hsla(30, 33%, 90%, 0.85)",
  },
  activeMeta: {
    gap: 6,
    marginBottom: 8,
  },
  placeLine: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.teal,
  },
  descLine: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  hintLine: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.warmGray,
    lineHeight: 17,
    marginTop: 4,
  },
  detailLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  detailLoadingText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  gridContent: {
    paddingHorizontal: PAGE_PAD,
  },
  columnWrap: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridEmpty: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  gridEmptyTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.foreground,
    marginTop: 8,
  },
  gridEmptyBody: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.foreground,
  },
  emptyBody: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  primaryBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  primaryPressed: {
    opacity: 0.92,
  },
  primaryBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.primaryForeground,
  },
  textLink: {
    alignSelf: "flex-start",
    paddingVertical: 8,
  },
  textLinkPressed: {
    opacity: 0.85,
  },
  textLinkLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.teal,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  cardUnavailable: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.muted,
  },
  cardUnavailableText: {
    fontFamily: fonts.sans,
    color: colors.mutedForeground,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardImagePh: {
    backgroundColor: colors.secondary,
  },
  cardScrim: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  cardScrimFill: {
    height: CARD_H * 0.56,
    width: "100%",
    backgroundColor: "rgba(16, 22, 34, 0.88)",
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  cardTopRow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.foreground,
  },
  miniPlatform: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  miniPlatformText: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    color: colors.primaryForeground,
    textTransform: "lowercase",
  },
  cardFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
  },
  cardOverlayTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: "rgba(255,255,255,0.95)",
    marginBottom: 4,
    lineHeight: 17,
  },
  cardOverlayNote: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 16,
  },
  cardOverlayNoteEmphasis: {
    fontFamily: fonts.sansMedium,
    color: "rgba(255,255,255,0.92)",
  },
  cardDates: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: "rgba(255,255,255,0.65)",
    marginTop: 6,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderBtnPressed: {
    opacity: 0.7,
  },
  modalCancel: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.teal,
    minWidth: 56,
  },
  modalTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.foreground,
  },
  modalHeaderSpacer: {
    width: 56,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  modalImage: {
    width: "100%",
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
  },
  modalImageFallback: {
    backgroundColor: colors.secondary,
  },
  modalVideoTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.foreground,
    marginTop: 4,
  },
  platformPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 4,
  },
  platformPillText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.primaryForeground,
    textTransform: "capitalize",
  },
  fieldLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.foreground,
    marginTop: 8,
  },
  noteInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.card,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.card,
  },
  dateInputFlex: {
    flex: 1,
  },
  dateArrow: {
    fontFamily: fonts.sans,
    color: colors.mutedForeground,
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  saveBtnPressed: {
    opacity: 0.92,
  },
  saveBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.primaryForeground,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  secondaryBtnPressed: {
    opacity: 0.9,
  },
  secondaryBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.teal,
  },
});
