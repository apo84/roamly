import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { CollectionPreviewCard } from "../../../components/CollectionPreviewCard";
import { SignInPrompt } from "../../../components/SignInPrompt";
import { useAuth } from "../../../contexts/AuthContext";
import { ApiError, formatApiFailure, listCollections } from "../../../lib/api/inspiration";
import type { CollectionSummary } from "../../../types/inspiration";
import { colors, fonts, radius } from "../../../theme";

export default function CollectionsScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const colW = (width - 16 * 2 - 12) / 2;

  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const rows = await listCollections();
      setCollections(rows);
    } catch (e) {
      setCollections([]);
      if (__DEV__) {
        console.warn("[collections/index] load failed\n", formatApiFailure(e).detail);
      } else if (e instanceof ApiError) {
        console.warn("[collections/index]", e.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) void load(false);
    }, [load, isAuthenticated]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isAuthenticated
        ? () => (
            <Pressable
              onPress={() => router.push("/(tabs)/collections/new")}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
              hitSlop={12}
            >
              <Text style={styles.headerBtnLabel}>New</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, router, isAuthenticated]);

  if (!isReady) {
    return <View style={styles.screen} />;
  }

  if (!isAuthenticated) {
    return <SignInPrompt message="Sign in to view and manage your collections." />;
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        contentContainerStyle={[styles.list, collections.length === 0 && styles.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
        ListHeaderComponent={
          <>
            <Text style={styles.h1}>Collections</Text>
            <Text style={styles.lead}>Your trip buckets — add clips from Inspo, then preview them on the Trip tab.</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No collections yet</Text>
            <Text style={styles.emptyBody}>Create one to organize saves and build trip previews.</Text>
            <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryPressed]} onPress={() => router.push("/(tabs)/collections/new")}>
              <Text style={styles.primaryBtnText}>New collection</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ width: colW, marginBottom: 12 }}>
            <CollectionPreviewCard
              collection={item}
              style={{ width: colW }}
              onPress={() => router.push(`/(tabs)/collections/${item.id}`)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listEmpty: {
    flexGrow: 1,
  },
  columnWrap: {
    gap: 12,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.foreground,
    marginBottom: 8,
  },
  lead: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 16,
    lineHeight: 20,
  },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    marginRight: 4,
  },
  headerBtnPressed: {
    opacity: 0.85,
  },
  headerBtnLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.primary,
  },
  empty: {
    paddingVertical: 32,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.foreground,
  },
  emptyBody: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
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
});
