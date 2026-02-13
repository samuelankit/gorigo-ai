#!/bin/bash
set -e
npm run build
mkdir -p dist
cat > dist/index.cjs << 'EOF'
const { execSync } = require("child_process");
process.env.PORT = process.env.PORT || "5000";
execSync("npx next start -p " + process.env.PORT, {
  stdio: "inherit",
  cwd: __dirname + "/..",
});
EOF
echo "Build complete. dist/index.cjs created."
