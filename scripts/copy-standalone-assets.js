const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(root, ".next", "standalone", ".next", "static");

if (copyDirSync(staticSrc, staticDest)) {
  console.log("[postbuild] Copied .next/static -> .next/standalone/.next/static");
} else {
  console.warn("[postbuild] .next/static not found, skipping");
}

const publicSrc = path.join(root, "public");
const publicDest = path.join(root, ".next", "standalone", "public");

if (copyDirSync(publicSrc, publicDest)) {
  console.log("[postbuild] Copied public -> .next/standalone/public");
} else {
  console.warn("[postbuild] public dir not found, skipping");
}

console.log("[postbuild] Standalone assets ready.");
