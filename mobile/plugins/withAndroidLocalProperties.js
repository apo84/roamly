/**
 * Writes android/local.properties during prebuild so the first `expo run:android` finds the SDK
 * (npm pre-script alone is not enough: android/ may not exist until prebuild runs).
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");
const { resolveAndroidSdk } = require("../scripts/androidSdkPath.cjs");

function withAndroidLocalProperties(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const sdk = resolveAndroidSdk(projectRoot);
      if (!sdk) {
        console.warn(
          "[android-sdk] SDK not found during prebuild. Set ANDROID_HOME or ANDROID_SDK_ROOT, or install Android Studio. Run: node ./scripts/ensure-android-local-properties.cjs after installing the SDK.",
        );
        return cfg;
      }
      const propsPath = path.join(platformRoot, "local.properties");
      const line = `sdk.dir=${sdk.replace(/\\/g, "/")}\n`;
      await fs.promises.writeFile(propsPath, line, "utf8");
      return cfg;
    },
  ]);
}

module.exports = withAndroidLocalProperties;
