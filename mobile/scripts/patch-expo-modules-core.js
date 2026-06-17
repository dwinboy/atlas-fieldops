const fs = require("node:fs");
const path = require("node:path");

const filePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo-modules-core",
  "android",
  "src",
  "main",
  "java",
  "expo",
  "modules",
  "adapters",
  "react",
  "permissions",
  "PermissionsService.kt",
);

if (!fs.existsSync(filePath)) {
  process.exit(0);
}

const source = fs.readFileSync(filePath, "utf8");
const before = "return requestedPermissions.contains(permission)";
const after = "return requestedPermissions?.contains(permission) == true";

if (source.includes(after)) {
  process.exit(0);
}

if (!source.includes(before)) {
  console.warn("Atlas FieldOps: expo-modules-core permission patch target not found.");
  process.exit(0);
}

fs.writeFileSync(filePath, source.replace(before, after));
console.log("Atlas FieldOps: patched expo-modules-core for Android API 35 builds.");
