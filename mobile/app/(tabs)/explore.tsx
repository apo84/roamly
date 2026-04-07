import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { VideoCard } from "../../components/VideoCard";
import { categories, mockVideos } from "../../data/mockData";
import { colors, fonts, radius } from "../../theme";

export default function ExploreScreen() {
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      mockVideos.filter((v) => {
        const q = search.trim().toLowerCase();
        const matchSearch =
          !q ||
          v.title.toLowerCase().includes(q) ||
          v.caption.toLowerCase().includes(q) ||
          v.creator.toLowerCase().includes(q);
        const matchCat = !activeCategory || v.category === activeCategory;
        return matchSearch && matchCat;
      }),
    [search, activeCategory],
  );

  const gap = 12;
  const pad = 16;
  const colW = (width - pad * 2 - gap) / 2;

  return (
    <View style={styles.screen}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <Text style={styles.h1}>Explore Videos</Text>
            <Text style={styles.lead}>Discover travel content from creators worldwide</Text>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search destinations, creators…"
              placeholderTextColor={colors.mutedForeground}
              style={styles.search}
            />

            <Text style={styles.filterLabel}>Categories</Text>
            <View style={styles.chips}>
              <Pressable
                onPress={() => setActiveCategory(null)}
                style={[styles.chip, activeCategory === null && styles.chipActive]}
              >
                <Text style={[styles.chipText, activeCategory === null && styles.chipTextActive]}>All</Text>
              </Pressable>
              {categories.map((cat) => {
                const on = activeCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setActiveCategory(on ? null : cat.id)}
                    style={[styles.chip, on && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextActive]}>
                      {cat.emoji} {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No videos match your search.</Text>
        }
        renderItem={({ item }) => (
          <View style={{ width: colW, marginBottom: gap }}>
            <VideoCard video={item} />
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
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 8,
  },
  columnWrap: {
    gap: 12,
    marginBottom: 0,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.foreground,
    marginBottom: 8,
  },
  lead: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 20,
    lineHeight: 24,
  },
  search: {
    fontFamily: fonts.sans,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 20,
  },
  filterLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 10,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.secondaryForeground,
  },
  chipTextActive: {
    color: colors.primaryForeground,
    fontFamily: fonts.sansMedium,
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 32,
  },
});
