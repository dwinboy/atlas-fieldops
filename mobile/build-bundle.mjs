/**
 * build-bundle.mjs
 * Builds the Metro JS bundle using Metro's JS API directly.
 * Faster than the CLI because it skips process spawning + Expo CLI overhead.
 * Usage: node build-bundle.mjs <output-file>
 */
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import url from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const output = process.argv[2] || "/tmp/index.android.bundle.js";

console.log(`[build-bundle] Building Android bundle → ${output}`);
const startMs = Date.now();

// Load metro config the same way expo does
const { loadConfig } = require("@expo/metro-config");
const Metro = require("metro");

const projectRoot = __dirname;
const config = await loadConfig({ projectRoot });

// Override for production output
config.transformer = config.transformer || {};
config.transformer.minifierConfig = { compress: { unused: false } };
config.serializer = config.serializer || {};

const bundleOptions = {
  dev: false,
  minify: false,
  platform: "android",
  entryFile: require.resolve("expo-router/entry"),
  sourceMap: false,
  bundleOutput: output,
  assetsOutput: "/tmp/bundle-assets",
};

const { code, map } = await Metro.buildBundle(
  config,
  {
    ...bundleOptions,
    bundleType: "bundle",
  }
);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, code);

const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
console.log(`[build-bundle] Done in ${elapsed}s — ${(fs.statSync(output).size / 1024 / 1024).toFixed(2)} MB`);
