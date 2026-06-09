"use strict";
const path = require("path");
const fs = require("fs");

const output = process.argv[2] || "/tmp/index.android.bundle.js";
console.log(`[build] → ${output}`);
const t0 = Date.now();

const projectRoot = __dirname;
const { getDefaultConfig } = require("@expo/metro-config");
const Metro = require("metro");

async function main() {
  const config = await getDefaultConfig(projectRoot);
  await Metro.runBuild(config, {
    entry: require.resolve("expo-router/entry"),
    out: output,
    platform: "android",
    dev: false,
    minify: false,
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const size = (fs.statSync(output).size / 1024 / 1024).toFixed(2);
  console.log(`[build] Done ${elapsed}s — ${size} MB`);
}

main().catch((e) => { console.error("[build] FAILED:", e.message); process.exit(1); });
