/**
 * Dynamic Expo config: expose API base as extra.apiUrl (read at runtime via expo-constants).
 * We read EXPO_PUBLIC_API_URL straight from mobile/.env so it never depends on a polluted
 * process.env (shell exports, another tool loading a different .env first, etc.).
 */
const fs = require("fs");
const path = require("path");

const ENV_FILE = path.join(__dirname, ".env");

/** Parse KEY=value from a .env file (last match wins, like many dotenv loaders). */
function readEnvKeyFromFile(filePath, key) {
  let last = "";
  try {
    if (!fs.existsSync(filePath)) return "";
    const text = fs.readFileSync(filePath, "utf8");
    const prefix = `${key}=`;
    for (const rawLine of text.split(/\n/)) {
      const line = rawLine.replace(/\r$/, "").trim();
      if (!line || line.startsWith("#")) continue;
      if (!line.startsWith(prefix)) continue;
      let val = line.slice(prefix.length).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      last = val;
    }
  } catch {
    /* ignore */
  }
  return last;
}

/** Load full .env into process.env for other tools / consistency */
function loadDotEnvSync(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const text = fs.readFileSync(filePath, "utf8");
    for (const rawLine of text.split(/\n/)) {
      const trimmed = rawLine.replace(/\r$/, "").trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const k = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[k] = val;
    }
  } catch {
    /* ignore */
  }
}

loadDotEnvSync(ENV_FILE);

const apiUrlFromEnvFile = readEnvKeyFromFile(ENV_FILE, "EXPO_PUBLIC_API_URL");
const apiUrl = apiUrlFromEnvFile || process.env.EXPO_PUBLIC_API_URL || "";

/** Android MapView (Google Maps). See docs/backend/GEOTAG.md */
const googleMapsAndroidKey =
  readEnvKeyFromFile(ENV_FILE, "EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY") ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ||
  "";

/** iOS only — needed if you use Google as the map provider on iOS in a dev/production build */
const googleMapsIosKey =
  readEnvKeyFromFile(ENV_FILE, "EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY") ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ||
  "";

// One line when Expo evaluates this file — confirms which file and value Metro will embed in extra.
// If this still shows localhost, the file at ENV_FILE on disk is wrong or a different folder is your Expo project root.
console.log(`[mobile app.config] EXPO_PUBLIC_API_URL → ${apiUrl || "(empty)"}\n  (read from ${ENV_FILE})`);

const appJson = require("./app.json");

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins || []),
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: googleMapsAndroidKey || undefined,
          iosGoogleMapsApiKey: googleMapsIosKey || undefined,
        },
      ],
      "./plugins/withGradle813",
      "./plugins/withAndroidLocalProperties",
    ],
    android: {
      ...appJson.expo.android,
      config: {
        ...(appJson.expo.android?.config || {}),
        ...(googleMapsAndroidKey ? { googleMaps: { apiKey: googleMapsAndroidKey } } : {}),
      },
    },
    extra: {
      ...(appJson.expo.extra || {}),
      apiUrl,
    },
  },
};
