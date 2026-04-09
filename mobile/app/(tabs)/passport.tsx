import { Image } from "expo-image";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PassportStampCard } from "../../components/PassportStampCard";
import { PassportStampComposer } from "../../components/PassportStampComposer";
import { SignInPrompt } from "../../components/SignInPrompt";
import { useAuth } from "../../contexts/AuthContext";
import { barcelonaLocations, mockPassport } from "../../data/barcelonaData";
import { loadAllPassportStamps, type PassportStamp } from "../../data/passportStamps";
import { colors, fonts, radius } from "../../theme";

export default function PassportScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const [stamps, setStamps] = useState<PassportStamp[]>([]);

  const refreshStamps = useCallback(async () => {
    const list = await loadAllPassportStamps();
    setStamps(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        void refreshStamps();
      }
    }, [isAuthenticated, refreshStamps]),
  );

  const totalLocations = barcelonaLocations.length;
  const checkedIn = mockPassport.length;
  const progress = totalLocations ? (checkedIn / totalLocations) * 100 : 0;

  if (!isReady) {
    return <View style={styles.screen} />;
  }

  if (!isAuthenticated) {
    return <SignInPrompt message="Sign in to open your travel passport." />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Digital Passport</Text>
      <Text style={styles.lead}>Your map of discovered gems — plus stamps you share as travel notes.</Text>

      <View style={styles.statsCard}>
        <View style={styles.statsTop}>
          <View>
            <Text style={styles.statsLabel}>Barcelona Explorer</Text>
            <Text style={styles.statsValue}>
              {checkedIn} / {totalLocations}{" "}
              <Text style={styles.statsValueMuted}>gems found</Text>
            </Text>
          </View>
          <View style={styles.ring}>
            <Text style={styles.ringText}>{Math.round(progress)}%</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%` }]} />
        </View>
        <Text style={styles.statsFoot}>1 city · {checkedIn} check-ins</Text>
      </View>

      <View style={styles.stampsHeader}>
        <View style={styles.stampsTitleBlock}>
          <Text style={styles.h2}>Stamps</Text>
          <Text style={styles.stampsSub}>Blog-style posts with tappable clips & collections</Text>
        </View>
        <PassportStampComposer onPosted={setStamps} />
      </View>

      {stamps.map((stamp) => (
        <PassportStampCard key={stamp.id} stamp={stamp} />
      ))}

      <Text style={[styles.h2, styles.journeyTitle]}>Your journey</Text>
      {mockPassport.map((entry, i) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.timeline}>
            <View style={styles.timelineDot} />
            {i < mockPassport.length - 1 ? <View style={styles.timelineLine} /> : null}
          </View>
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Image source={{ uri: entry.video.thumbnail }} style={styles.thumb} contentFit="cover" />
              <View style={styles.cardTopText}>
                <Text style={styles.locName}>{entry.location.name}</Text>
                <Text style={styles.locCity}>
                  {entry.location.city}, {entry.location.country}
                </Text>
                <Text style={styles.time}>
                  {new Date(entry.checkedInAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </Text>
              </View>
            </View>
            {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
          </View>
        </View>
      ))}

      <Text style={[styles.h2, styles.discoverTitle]}>Still to discover</Text>
      <View style={styles.discoverGrid}>
        {barcelonaLocations
          .filter((loc) => !mockPassport.some((p) => p.location.id === loc.id))
          .map((loc) => (
            <View key={loc.id} style={styles.discoverCell}>
              <Text style={styles.discoverPin}>📍</Text>
              <Text style={styles.discoverName}>{loc.name}</Text>
              <Text style={styles.discoverType}>{loc.type}</Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
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
    marginBottom: 20,
    lineHeight: 22,
  },
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 24,
  },
  statsTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statsLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  statsValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.foreground,
    marginTop: 4,
  },
  statsValueMuted: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
  },
  ring: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ringText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.primary,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.muted,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statsFoot: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  stampsHeader: {
    marginBottom: 16,
    gap: 12,
  },
  stampsTitleBlock: {
    gap: 4,
  },
  h2: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.foreground,
  },
  stampsSub: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  journeyTitle: {
    marginTop: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 14,
  },
  timeline: {
    width: 20,
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.card,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 32,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 80,
    borderRadius: radius.md,
  },
  cardTopText: {
    flex: 1,
    gap: 4,
  },
  locName: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.foreground,
  },
  locCity: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  time: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.warmGray,
    marginTop: 4,
  },
  note: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.foreground,
    marginTop: 12,
    lineHeight: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  discoverTitle: {
    marginTop: 8,
    marginBottom: 12,
  },
  discoverGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  discoverCell: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    padding: 12,
  },
  discoverPin: {
    fontSize: 18,
    marginBottom: 6,
  },
  discoverName: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  discoverType: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "capitalize",
    marginTop: 2,
  },
});
