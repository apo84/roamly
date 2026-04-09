import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PassportStamp } from "../data/passportStamps";
import { findCollectionById, findVideoById, hrefForClip, hrefForCollection } from "../data/passportStamps";
import { colors, fonts, radius } from "../theme";
import { PassportStampBody } from "./PassportStampBody";

function formatStampDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PassportStampCard({ stamp }: { stamp: PassportStamp; index?: number }) {
  const router = useRouter();
  const postmark = formatStampDate(stamp.postedAt);

  return (
    <View style={styles.motionWrap}>
      <View style={styles.outer}>
        <View style={styles.inner}>
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.stampLabel}>Roamly stamp</Text>
              <Text style={styles.title}>{stamp.title}</Text>
            </View>
            <View style={styles.postmark}>
              <Text style={styles.postmarkTop}>POSTED</Text>
              <Text style={styles.postmarkDate}>{postmark}</Text>
            </View>
          </View>

          <PassportStampBody body={stamp.body} />

          {stamp.attachments.length > 0 ? (
            <View style={styles.attachments}>
              <Text style={styles.attachmentsLabel}>Linked in app</Text>
              <View style={styles.chipRow}>
                {stamp.attachments.map((a) => {
                  if (a.type === "clip") {
                    const v = findVideoById(a.id);
                    return (
                      <Pressable
                        key={`${a.type}-${a.id}`}
                        style={({ pressed }) => [styles.chip, styles.chipClip, pressed && styles.chipPressed]}
                        onPress={() => router.push(hrefForClip(a.id) as Href)}
                      >
                        <Text style={styles.chipTextClip} numberOfLines={1}>
                          🎬 {v?.title ?? a.id}
                        </Text>
                      </Pressable>
                    );
                  }
                  const c = findCollectionById(a.id);
                  return (
                    <Pressable
                      key={`${a.type}-${a.id}`}
                      style={({ pressed }) => [styles.chip, styles.chipCol, pressed && styles.chipPressed]}
                      onPress={() => router.push(hrefForCollection(a.id) as Href)}
                    >
                      <Text style={styles.chipTextCol} numberOfLines={1}>
                        📁 {c?.name ?? a.id}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  motionWrap: {
    marginBottom: 20,
  },
  outer: {
    borderRadius: radius.lg,
    backgroundColor: "hsl(38, 35%, 92%)",
    borderWidth: 2,
    borderColor: "hsl(30, 18%, 72%)",
    padding: 3,
  },
  inner: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "hsl(30, 22%, 55%)",
    padding: 16,
    backgroundColor: "hsl(40, 40%, 97%)",
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  stampLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.foreground,
  },
  postmark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-8deg" }],
    backgroundColor: colors.card,
    opacity: 0.95,
  },
  postmarkTop: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  postmarkDate: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.foreground,
    textAlign: "center",
    marginTop: 2,
    paddingHorizontal: 4,
  },
  attachments: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "hsl(30, 18%, 82%)",
    gap: 8,
  },
  attachmentsLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.mutedForeground,
    textTransform: "uppercase",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    maxWidth: "100%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipClip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  chipCol: {
    backgroundColor: colors.card,
    borderColor: colors.tealLight,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipTextClip: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.primary,
    maxWidth: 200,
  },
  chipTextCol: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.teal,
    maxWidth: 200,
  },
});
