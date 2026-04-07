import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CollectionSummary } from "../types/inspiration";
import { colors, fonts, radius, shadows } from "../theme";

type Variant = "grid" | "trip";

export function CollectionPreviewCard({
  collection,
  onPress,
  style,
  variant = "grid",
}: {
  collection: CollectionSummary;
  onPress: () => void;
  style?: { width?: number };
  variant?: Variant;
}) {
  const place = [collection.city, collection.country].filter(Boolean).join(", ") || "Trip list";
  const countLabel = collection.item_count === 1 ? "1 clip" : `${collection.item_count} clips`;

  if (variant === "trip") {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.tripWrap, pressed && styles.pressed]}
      >
        <View style={[styles.tripCard, shadows.card]}>
          {collection.cover_image_url ? (
            <Image source={{ uri: collection.cover_image_url }} style={styles.tripCover} contentFit="cover" />
          ) : (
            <View style={[styles.tripCover, styles.coverPlaceholder]}>
              <Text style={styles.placeholderLetter}>{collection.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.tripBody}>
            <Text style={styles.tripTitle} numberOfLines={2}>
              {collection.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {place}
            </Text>
            <Text style={styles.count}>{countLabel}</Text>
            {collection.description ? (
              <Text style={styles.desc} numberOfLines={2}>
                {collection.description}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width: style?.width }, pressed && styles.pressed]}>
      <View style={[styles.card, shadows.card]}>
        {collection.cover_image_url ? (
          <Image source={{ uri: collection.cover_image_url }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.placeholderLetter}>{collection.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {collection.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {place}
          </Text>
          <Text style={styles.count}>{countLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.92 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cover: {
    width: "100%",
    aspectRatio: 4 / 3,
  },
  coverPlaceholder: {
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderLetter: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.teal,
  },
  cardBody: {
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.foreground,
  },
  meta: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  count: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.teal,
    marginTop: 4,
  },
  tripWrap: {
    marginBottom: 12,
  },
  tripCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripCover: {
    width: 100,
    minHeight: 100,
  },
  tripBody: {
    flex: 1,
    padding: 12,
    gap: 4,
    justifyContent: "center",
  },
  tripTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.foreground,
  },
  desc: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginTop: 4,
  },
});
