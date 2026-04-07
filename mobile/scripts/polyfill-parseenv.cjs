/**
 * Node.js 20.12+ adds util.parseEnv; Expo CLI @expo/env requires it.
 * Older Node (e.g. 20.5) crashes with "parseEnv is not a function" when running expo.
 * Load with: node --require ./scripts/polyfill-parseenv.cjs ...
 */
"use strict";

const util = require("node:util");

if (typeof util.parseEnv !== "function") {
  util.parseEnv = function parseEnv(contents) {
    if (typeof contents !== "string" || !contents) return {};
    const result = {};
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.replace(/^\uFEFF/, "").trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
    return result;
  };
}
