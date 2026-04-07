import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SignInPrompt } from "../../../components/SignInPrompt";
import { useAuth } from "../../../contexts/AuthContext";
import { ApiError, createCollection, formatApiFailure } from "../../../lib/api/inspiration";
import { colors, fonts, radius } from "../../../theme";

export default function NewCollectionScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isReady) {
    return <View style={styles.container} />;
  }

  if (!isAuthenticated) {
    return <SignInPrompt message="Sign in to create a collection." />;
  }

  async function onSubmit() {
    const n = name.trim();
    if (!n) {
      Alert.alert("Name required", "Give your collection a name.");
      return;
    }
    setSubmitting(true);
    try {
      const col = await createCollection({
        name: n,
        description: description.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
      });
      router.replace(`/(tabs)/collections/${col.id}`);
    } catch (e) {
      if (__DEV__) {
        console.warn("[collections/new] create failed\n", formatApiFailure(e).detail);
      }
      const f = formatApiFailure(e);
      Alert.alert(__DEV__ ? f.title : "Could not create", __DEV__ ? f.detail : e instanceof ApiError ? e.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>New collection</Text>
        <Text style={styles.subtitle}>A bucket for trip ideas. You can attach clips when saving from Inspo.</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="e.g. Tetons summer"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.multiline]}
          placeholder="What this trip is about"
          placeholderTextColor={colors.mutedForeground}
          multiline
        />

        <Text style={styles.label}>City (optional)</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          style={styles.input}
          placeholder="Destination city"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.label}>Country (optional)</Text>
        <TextInput
          value={country}
          onChangeText={setCountry}
          style={styles.input}
          placeholder="Country"
          placeholderTextColor={colors.mutedForeground}
        />

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, (pressed || submitting) && styles.primaryPressed]}
          onPress={onSubmit}
          disabled={submitting}
        >
          <Text style={styles.primaryText}>{submitting ? "Creating…" : "Create collection"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    gap: 8,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
    lineHeight: 22,
    marginBottom: 16,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.foreground,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.card,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.foreground,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryPressed: {
    opacity: 0.9,
  },
  primaryText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.primaryForeground,
  },
});
