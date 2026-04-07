import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { SignInPrompt } from "../../../components/SignInPrompt";
import { useAuth } from "../../../contexts/AuthContext";
import { ApiError, formatApiFailure, listCollections, saveInspiration } from "../../../lib/api/inspiration";
import type { CollectionSummary, SaveInspirationResult } from "../../../types/inspiration";
import { colors, fonts, radius } from "../../../theme";

export default function InspirationAddScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [visitStart, setVisitStart] = useState("");
  const [visitEnd, setVisitEnd] = useState("");
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<SaveInspirationResult | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    setLoadingCollections(true);
    listCollections()
      .then((rows) => {
        if (alive) setCollections(rows);
      })
      .catch((e) => {
        if (alive) {
          const msg = e instanceof ApiError ? e.message : "Failed to load collections";
          Alert.alert("Collections", msg);
        }
      })
      .finally(() => {
        if (alive) setLoadingCollections(false);
      });
    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  if (!isReady) {
    return <View style={styles.container} />;
  }

  if (!isAuthenticated) {
    return <SignInPrompt message="Sign in to paste a link and save it to your library." />;
  }

  const openUrl = useMemo(() => saved?.video.video_url ?? saved?.video.canonical_url ?? null, [saved]);

  async function onSubmit() {
    if (!url.trim()) {
      Alert.alert("Missing URL", "Paste an Instagram, TikTok, or YouTube URL.");
      return;
    }
    setSubmitting(true);
    if (__DEV__) {
      console.log("[inspiration/add] save started", { urlLen: url.trim().length, hasCollection: Boolean(selectedCollectionId) });
    }
    try {
      const result = await saveInspiration({
        url: url.trim(),
        note: note.trim() || undefined,
        collectionId: selectedCollectionId ?? undefined,
        visitStart: visitStart.trim() || undefined,
        visitEnd: visitEnd.trim() || undefined,
      });
      setSaved(result);
      if (__DEV__) {
        console.log("[inspiration/add] save success", { videoId: result.video.id });
      }
      Alert.alert("Saved", "Link added to your library.");
      router.replace(`/(tabs)/inspiration/${result.video.id}`);
    } catch (e) {
      if (__DEV__) {
        console.warn("[inspiration/add] save failed\n", formatApiFailure(e).detail);
      }
      const f = formatApiFailure(e);
      Alert.alert(
        __DEV__ ? f.title : "Save failed",
        __DEV__ ? f.detail : e instanceof ApiError ? e.message : "Failed to save link",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Add a travel link</Text>
      <Text style={styles.subtitle}>Paste a social link, add context, and optionally attach to a collection.</Text>

      <TextInput
        value={url}
        onChangeText={setUrl}
        style={styles.input}
        placeholder="https://www.instagram.com/reel/..."
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        value={note}
        onChangeText={setNote}
        style={[styles.input, styles.noteInput]}
        placeholder="Why this place matters..."
        multiline
      />

      <Text style={styles.section}>Collection (optional)</Text>
      <View style={styles.chips}>
        <Pressable
          style={[styles.chip, selectedCollectionId === null && styles.chipActive]}
          onPress={() => setSelectedCollectionId(null)}
        >
          <Text style={[styles.chipText, selectedCollectionId === null && styles.chipTextActive]}>None</Text>
        </Pressable>
        {collections.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, selectedCollectionId === c.id && styles.chipActive]}
            onPress={() => setSelectedCollectionId(c.id)}
          >
            <Text style={[styles.chipText, selectedCollectionId === c.id && styles.chipTextActive]}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
      {loadingCollections ? <Text style={styles.hint}>Loading collections...</Text> : null}

      <Text style={styles.section}>Visit dates (optional, YYYY-MM-DD)</Text>
      <View style={styles.row}>
        <TextInput
          value={visitStart}
          onChangeText={setVisitStart}
          style={[styles.input, styles.rowInput]}
          placeholder="Start"
          autoCapitalize="none"
        />
        <TextInput
          value={visitEnd}
          onChangeText={setVisitEnd}
          style={[styles.input, styles.rowInput]}
          placeholder="End"
          autoCapitalize="none"
        />
      </View>

      <Pressable style={({ pressed }) => [styles.primaryBtn, (pressed || submitting) && styles.primaryPressed]} onPress={onSubmit}>
        <Text style={styles.primaryText}>{submitting ? "Saving..." : "Save link"}</Text>
      </Pressable>

      {openUrl ? (
        <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]} onPress={() => Linking.openURL(openUrl)}>
          <Text style={styles.secondaryText}>Open in app</Text>
        </Pressable>
      ) : null}
      <Text style={styles.hint}>
        Supported hosts: instagram.com, tiktok.com, youtu.be / youtube.com. Use the same auth session as Account.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    gap: 12,
    paddingBottom: 48,
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.card,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.foreground,
  },
  noteInput: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  section: {
    marginTop: 4,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.coralLight,
  },
  chipText: {
    fontFamily: fonts.sans,
    color: colors.foreground,
    fontSize: 13,
  },
  chipTextActive: {
    fontFamily: fonts.sansBold,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowInput: {
    flex: 1,
  },
  primaryBtn: {
    marginTop: 8,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    opacity: 0.9,
  },
  primaryText: {
    fontFamily: fonts.sansBold,
    color: colors.primaryForeground,
    fontSize: 16,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  secondaryPressed: {
    opacity: 0.9,
  },
  secondaryText: {
    fontFamily: fonts.sansBold,
    color: colors.foreground,
    fontSize: 15,
  },
  hint: {
    marginTop: 4,
    fontFamily: fonts.sans,
    color: colors.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
  },
});
