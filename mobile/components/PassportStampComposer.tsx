import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { barcelonaVideos } from "../data/barcelonaData";
import { mockCollections } from "../data/mockData";
import {
  appendPassportStamp,
  extractAttachmentsFromBody,
  type PassportStamp,
} from "../data/passportStamps";
import { colors, fonts, radius } from "../theme";

export function PassportStampComposer({ onPosted }: { onPosted: (stamps: PassportStamp[]) => void }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const insertToken = useCallback((type: "clip" | "collection", id: string) => {
    const token = type === "clip" ? `{{clip:${id}}}` : `{{collection:${id}}}`;
    setBody((prev) => {
      const spacer = prev.length && !/\s$/.test(prev) ? " " : "";
      return `${prev}${spacer}${token} `;
    });
  }, []);

  const post = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const stamp: PassportStamp = {
      id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim() || "Untitled stamp",
      body: trimmed,
      postedAt: new Date().toISOString(),
      attachments: extractAttachmentsFromBody(trimmed),
    };
    const next = await appendPassportStamp(stamp);
    onPosted(next);
    setTitle("");
    setBody("");
    setOpen(false);
  };

  return (
    <>
      <Pressable style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>＋ Issue new stamp</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modalRoot, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New passport stamp</Text>
            <Pressable hitSlop={12} onPress={() => setOpen(false)}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <Text style={styles.modalLead}>
            Write your story. Tap clips or collections below to insert tappable links.
          </Text>

          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Golden hour in El Born"
            placeholderTextColor={colors.mutedForeground}
            style={styles.input}
          />

          <Text style={styles.label}>Story</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write freely…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, styles.textarea]}
            multiline
          />

          <View style={styles.pickerRow}>
            <View style={styles.pickerCol}>
              <Text style={styles.pickerTitle}>Barcelona clips</Text>
              <FlatList
                data={barcelonaVideos}
                keyExtractor={(item) => item.id}
                style={styles.pickerList}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable style={({ pressed }) => [styles.pickRow, pressed && styles.pickRowPressed]} onPress={() => insertToken("clip", item.id)}>
                    <Text style={styles.pickRowText} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
            <View style={styles.pickerCol}>
              <Text style={styles.pickerTitle}>Collections</Text>
              <FlatList
                data={mockCollections}
                keyExtractor={(item) => item.id}
                style={styles.pickerList}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [styles.pickRow, pressed && styles.pickRowPressed]}
                    onPress={() => insertToken("collection", item.id)}
                  >
                    <Text style={styles.pickRowText} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable style={({ pressed }) => [styles.outlineBtn, pressed && styles.btnPressed]} onPress={() => setOpen(false)}>
              <Text style={styles.outlineBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, !body.trim() && styles.primaryBtnDisabled, pressed && styles.btnPressed]}
              onPress={() => void post()}
              disabled={!body.trim()}
            >
              <Text style={styles.primaryBtnText}>Post stamp</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
  },
  triggerPressed: {
    opacity: 0.9,
  },
  triggerText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.primaryForeground,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.foreground,
  },
  close: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.primary,
  },
  modalLead: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: 16,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  textarea: {
    minHeight: 100,
    maxHeight: 140,
  },
  pickerRow: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 180,
  },
  pickerCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: 8,
    overflow: "hidden",
  },
  pickerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.foreground,
    marginBottom: 6,
  },
  pickerList: {
    flex: 1,
  },
  pickRow: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.md,
  },
  pickRowPressed: {
    backgroundColor: colors.muted,
  },
  pickRowText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.foreground,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  outlineBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  outlineBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.foreground,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.primaryForeground,
  },
  btnPressed: {
    opacity: 0.88,
  },
});
