/**
 * Shared Android SDK resolution for local.properties (Gradle).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

function loadEnvFileForSdk(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const text = fs.readFileSync(filePath, "utf8");
    for (const rawLine of text.split("\n")) {
      const line = rawLine.replace(/\r$/, "").trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const k = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (k === "ANDROID_HOME" || k === "ANDROID_SDK_ROOT") process.env[k] = val;
    }
  } catch {
    /* ignore */
  }
}

function isLikelySdk(dir) {
  if (!dir || !fs.existsSync(dir)) return false;
  return (
    fs.existsSync(path.join(dir, "platforms")) || fs.existsSync(path.join(dir, "build-tools"))
  );
}

/**
 * @param {string} projectRoot - e.g. mobile/ folder
 * @returns {string | null} absolute path to SDK
 */
function resolveAndroidSdk(projectRoot) {
  loadEnvFileForSdk(path.join(projectRoot, ".env"));

  const fromEnv = (process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "").trim();
  if (fromEnv) {
    const resolved = path.resolve(fromEnv);
    if (isLikelySdk(resolved)) return resolved;
  }

  if (process.platform === "darwin") {
    const p = path.join(os.homedir(), "Library", "Android", "sdk");
    if (isLikelySdk(p)) return p;
  }

  if (process.platform === "win32") {
    const la = process.env.LOCALAPPDATA;
    if (la) {
      const p = path.join(la, "Android", "Sdk");
      if (isLikelySdk(p)) return p;
    }
  }

  const linuxDefault = path.join(os.homedir(), "Android", "Sdk");
  if (isLikelySdk(linuxDefault)) return linuxDefault;

  return null;
}

module.exports = { resolveAndroidSdk, isLikelySdk };
