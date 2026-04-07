"use strict";

const fs = require("fs");
const path = require("path");
const { resolveAndroidSdk } = require("./androidSdkPath.cjs");

const MOBILE_ROOT = path.join(__dirname, "..");
const ANDROID_DIR = path.join(MOBILE_ROOT, "android");
const PROPS_FILE = path.join(ANDROID_DIR, "local.properties");

if (!fs.existsSync(ANDROID_DIR)) {
  console.warn("[android-sdk] No android/ folder yet — skipping local.properties.");
  process.exit(0);
}

const sdk = resolveAndroidSdk(MOBILE_ROOT);
if (!sdk) {
  console.error(`[android-sdk] Could not find the Android SDK.

Do one of the following:
  • Install Android Studio and open SDK Manager (default macOS path:
    ${path.join(require("os").homedir(), "Library", "Android", "sdk")})
  • export ANDROID_HOME="/path/to/Android/sdk"
  • Add to mobile/.env:
    ANDROID_SDK_ROOT=/path/to/Android/sdk
`);
  process.exit(1);
}

const sdkDirProp = `sdk.dir=${sdk.replace(/\\/g, "/")}\n`;
fs.writeFileSync(PROPS_FILE, sdkDirProp, "utf8");
console.log("[android-sdk] android/local.properties → sdk.dir=" + sdk.replace(/\\/g, "/"));
