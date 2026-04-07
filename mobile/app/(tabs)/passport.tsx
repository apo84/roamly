import { Image } from "expo-image";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { SignInPrompt } from "../../components/SignInPrompt";
import { useAuth } from "../../contexts/AuthContext";
import { mockPassport } from "../../data/barcelonaData";
import { colors, fonts, radius } from "../../theme";

export default function PassportScreen() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return <View style={styles.screen} />;
  }

  if (!isAuthenticated) {
    return <SignInPrompt message="Sign in to open your travel passport." />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Passport</Text>
      <Text style={styles.lead}>
        {mockPassport.length} check-ins · same mock entries as the web Passport page.
      </Text>
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
    paddingBottom: 32,
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
});
