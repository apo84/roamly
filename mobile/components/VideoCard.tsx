import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import type { Video } from "../data/mockData";
import { displaySocialText } from "../lib/htmlEntities";
import { colors, fonts, platformColors, radius, shadows } from "../theme";
import { formatCount } from "../utils/format";

export function VideoCard({ video }: { video: Video }) {
  const loc = video.locations[0];
  const platformBg = platformColors[video.platform];

  return (
    <View style={[styles.card, shadows.card]}>
      <View style={styles.thumbWrap}>
        <Image source={{ uri: video.thumbnail }} style={styles.thumb} contentFit="cover" />
        <View style={styles.thumbOverlay} pointerEvents="none" />
        <View style={[styles.platformBadge, { backgroundColor: platformBg }]}>
          <Text style={styles.platformText}>{video.platform}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>♥ {formatCount(video.likes)}</Text>
          <Text style={styles.statText}>  ·  👁 {formatCount(video.views)}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {displaySocialText(video.title)}
        </Text>
        <View style={styles.creatorRow}>
          <Image source={{ uri: video.creatorAvatar }} style={styles.avatar} />
          <Text style={styles.creator}>@{video.creator}</Text>
        </View>
        {loc ? (
          <Text style={styles.location}>
            <Text style={styles.pin}>📍 </Text>
            {loc.city}, {loc.country}
          </Text>
        ) : null}
        <View style={styles.tags}>
          {video.hashtags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbWrap: {
    aspectRatio: 3 / 4,
    position: "relative",
  },
  thumb: {
    ...StyleSheet.absoluteFillObject,
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.2)",
  },
  platformBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  platformText: {
    color: colors.primaryForeground,
    fontSize: 11,
    fontFamily: fonts.sansBold,
    textTransform: "lowercase",
  },
  statsRow: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statText: {
    color: colors.primaryForeground,
    fontSize: 11,
    fontFamily: fonts.sansMedium,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  body: {
    padding: 14,
    gap: 6,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.foreground,
    lineHeight: 22,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  creator: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  location: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  pin: {
    color: colors.primary,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.secondaryForeground,
  },
});
