import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import { SignInPrompt } from "../../components/SignInPrompt";
import { useAuth } from "../../contexts/AuthContext";
import { ApiError, formatApiFailure, listMapPins } from "../../lib/api/inspiration";
import { displaySocialText } from "../../lib/htmlEntities";
import type { MapPin } from "../../types/inspiration";
import { colors, fonts, radius } from "../../theme";

function regionForPins(pins: MapPin[]) {
  if (!pins.length) {
    return {
      latitude: 20,
      longitude: 0,
      latitudeDelta: 60,
      longitudeDelta: 120,
    };
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of pins) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const pad = 0.08;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + pad, 0.25),
    longitudeDelta: Math.max(maxLng - minLng + pad, 0.25),
  };
}

class MapErrorBoundary extends Component<{
  onError: (error: unknown) => void;
  children: any;
}> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function MapScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<MapPin | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const [mapInitError, setMapInitError] = useState<unknown | null>(null);

  const zoomBy = useCallback(async (delta: number) => {
    const map = mapRef.current as (MapView & { getCamera?: () => Promise<{ zoom?: number }>; animateCamera?: (camera: { zoom: number }, opts?: { duration?: number }) => void }) | null;
    if (!map?.getCamera || !map?.animateCamera) return;
    try {
      const camera = await map.getCamera();
      const currentZoom = typeof camera.zoom === "number" ? camera.zoom : 8;
      const nextZoom = Math.max(2, Math.min(20, currentZoom + delta));
      map.animateCamera({ zoom: nextZoom }, { duration: 180 });
    } catch (e) {
      if (__DEV__) console.warn("[map] zoom change failed", e);
    }
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const rows = await listMapPins();
      setPins(rows);
    } catch (e) {
      if (__DEV__) {
        console.warn("[map] load failed\n", formatApiFailure(e).detail);
      } else {
        const msg = e instanceof ApiError ? e.message : "Failed to load map pins";
        console.warn("[map]", msg);
      }
      setPins([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        void load(false);
      }
    }, [load, isAuthenticated]),
  );

  const initialRegion = useMemo(() => regionForPins(pins), [pins]);

  useEffect(() => {
    if (mapInitError || !pins.length || !mapRef.current) return;
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        pins.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        { edgePadding: { top: 100, right: 36, bottom: 220, left: 36 }, animated: true },
      );
    }, 300);
    return () => clearTimeout(t);
  }, [pins]);

  if (!isReady) {
    return <View style={styles.screen} />;
  }
  if (!isAuthenticated) {
    return <SignInPrompt message="Sign in to see your saved clips on the map." />;
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
      {mapInitError ? (
        <View style={styles.mapFallback} pointerEvents="none">
          <Text style={styles.mapFallbackTitle}>Map failed to initialize</Text>
          <Text style={styles.mapFallbackBody}>
            Your client is missing native map support required by `react-native-maps`. Pins may still appear in the list below.
          </Text>
        </View>
      ) : (
        <MapErrorBoundary
          onError={(e) => {
            if (__DEV__) console.warn("[map] MapView init error", e);
            setMapInitError(e);
          }}
        >
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            initialRegion={initialRegion}
            showsUserLocation
          >
            {pins.map((p) => (
              <Marker
                key={`${p.videoId}-${p.locationId}`}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                title={displaySocialText(p.title)}
                description={p.placeLabel}
                onPress={() => setSelected(p)}
              />
            ))}
          </MapView>
        </MapErrorBoundary>
      )}

      {!mapInitError ? (
        <View style={styles.zoomRail} pointerEvents="box-none">
          <Pressable style={({ pressed }) => [styles.zoomBtn, pressed && styles.zoomBtnPressed]} onPress={() => void zoomBy(1)}>
            <Text style={styles.zoomBtnText}>+</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.zoomBtn, pressed && styles.zoomBtnPressed]} onPress={() => void zoomBy(-1)}>
            <Text style={styles.zoomBtnText}>-</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={[styles.sheet, mapInitError ? styles.sheetTall : undefined]}
        contentContainerStyle={styles.sheetContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
      >
        {pins.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No pins yet</Text>
            <Text style={styles.emptyBody}>
              Save travel clips from Inspo. When geotagging is enabled on the server, places appear automatically; you can still attach a place
              manually from a clip’s detail screen.
            </Text>
          </View>
        ) : (
          pins.map((item) => {
            const thumb = item.thumbnail_url || undefined;
            return (
              <Pressable
                key={`${item.videoId}-${item.locationId}`}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => setSelected(item)}
              >
                {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" /> : <View style={[styles.thumb, styles.thumbFallback]} />}
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {displaySocialText(item.title)}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {item.placeLabel} · {item.lat.toFixed(2)}, {item.lng.toFixed(2)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Modal visible={selected !== null} animationType="fade" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)} />
          <View style={styles.modalCard}>
            {selected ? (
              <>
                {selected.thumbnail_url ? (
                  <Image source={{ uri: selected.thumbnail_url }} style={styles.modalThumb} contentFit="cover" />
                ) : (
                  <View style={[styles.modalThumb, styles.thumbFallback]} />
                )}
                <Text style={styles.modalTitle} numberOfLines={3}>
                  {displaySocialText(selected.title)}
                </Text>
                <Text style={styles.modalMeta}>{selected.placeLabel}</Text>
                <View style={styles.modalActions}>
                  <Pressable style={({ pressed }) => [styles.modalBtn, pressed && styles.modalBtnPressed]} onPress={() => setSelected(null)}>
                    <Text style={styles.modalBtnGhost}>Close</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.modalBtnPrimary, pressed && styles.modalBtnPressed]}
                    onPress={() => {
                      const id = selected.videoId;
                      setSelected(null);
                      router.push(`/(tabs)/inspiration/${id}`);
                    }}
                  >
                    <Text style={styles.modalBtnPrimaryText}>Open clip</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.muted,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: "42%",
    justifyContent: "flex-start",
  },
  mapFallbackTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.foreground,
    marginBottom: 10,
  },
  mapFallbackBody: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 21,
  },
  mapFallbackMono: {
    fontFamily: fonts.sansMedium,
    color: colors.foreground,
  },
  zoomRail: {
    position: "absolute",
    right: 12,
    top: 12,
    gap: 10,
  },
  zoomBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnPressed: {
    opacity: 0.86,
  },
  zoomBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 26,
    lineHeight: 28,
    color: colors.foreground,
    marginTop: -1,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "38%",
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetTall: {
    maxHeight: "55%",
  },
  sheetContent: {
    padding: 12,
    paddingBottom: 28,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    alignItems: "center",
  },
  rowPressed: {
    opacity: 0.92,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  thumbFallback: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  rowMeta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  empty: {
    padding: 12,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: fonts.sansBold,
    color: colors.foreground,
    fontSize: 16,
  },
  emptyBody: {
    fontFamily: fonts.sans,
    color: colors.mutedForeground,
    lineHeight: 20,
    fontSize: 14,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    marginHorizontal: 16,
    marginBottom: 32,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  modalThumb: {
    width: "100%",
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.foreground,
  },
  modalMeta: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.teal,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  modalBtnPressed: {
    opacity: 0.9,
  },
  modalBtnGhost: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.foreground,
  },
  modalBtnPrimaryText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.primaryForeground,
  },
});
