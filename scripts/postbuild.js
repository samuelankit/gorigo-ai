const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const content = `const { execSync } = require("child_process");
process.env.PORT = process.env.PORT || "5000";
execSync("npx next start -p " + process.env.PORT, {
  stdio: "inherit",
  cwd: __dirname + "/..",
});
`;

fs.writeFileSync(path.join(distDir, "index.cjs"), content);
console.log("Created dist/index.cjs");
