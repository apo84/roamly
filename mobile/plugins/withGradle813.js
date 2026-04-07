/**
 * React Native 0.83’s template uses Gradle 9 + foojay-resolver-convention 0.5.0, which references
 * JvmVendorSpec.IBM_SEMERU — removed in Gradle 9 → build fails. Pin wrapper to Gradle 8.13 until upstream aligns.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const GRADLE_DIST = "gradle-8.13-bin.zip";

function withGradle813(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const root = cfg.modRequest.platformProjectRoot;
      const propsPath = path.join(root, "gradle", "wrapper", "gradle-wrapper.properties");
      if (!fs.existsSync(propsPath)) return cfg;
      let text = await fs.promises.readFile(propsPath, "utf8");
      const next = text.replace(/gradle-[0-9.]+-bin\.zip/, GRADLE_DIST);
      if (next !== text) await fs.promises.writeFile(propsPath, next, "utf8");
      return cfg;
    },
  ]);
}

module.exports = withGradle813;
