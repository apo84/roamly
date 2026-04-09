import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import {
  findCollectionById,
  findVideoById,
  hrefForClip,
  hrefForCollection,
} from "../data/passportStamps";
import { colors, fonts } from "../theme";

const TOKEN_RE = /\{\{(clip|collection):([^}]+)\}\}/g;

type Segment =
  | { kind: "text"; value: string }
  | { kind: "clip"; id: string }
  | { kind: "collection"; id: string };

function parseBody(body: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN_RE.source, "g");
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) {
      segments.push({ kind: "text", value: body.slice(last, m.index) });
    }
    const type = m[1] as "clip" | "collection";
    segments.push({ kind: type, id: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < body.length) {
    segments.push({ kind: "text", value: body.slice(last) });
  }
  return segments;
}

export function PassportStampBody({ body }: { body: string }) {
  const router = useRouter();
  const segments = parseBody(body);

  return (
    <Text style={styles.paragraph}>
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <Text key={i}>{seg.value}</Text>;
        }
        if (seg.kind === "clip") {
          const video = findVideoById(seg.id);
          const label = video?.title ?? seg.id;
          return (
            <Text
              key={i}
              onPress={() => router.push(hrefForClip(seg.id) as Href)}
              style={styles.linkClip}
            >
              {label}
            </Text>
          );
        }
        const col = findCollectionById(seg.id);
        const label = col?.name ?? "Collection";
        return (
          <Text
            key={i}
            onPress={() => router.push(hrefForCollection(seg.id) as Href)}
            style={styles.linkCollection}
          >
            {label}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 24,
    color: colors.foreground,
  },
  linkClip: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 24,
    color: colors.primary,
    textDecorationLine: "underline",
    textDecorationColor: colors.coralLight,
  },
  linkCollection: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 24,
    color: colors.teal,
    textDecorationLine: "underline",
    textDecorationColor: colors.tealLight,
  },
});
