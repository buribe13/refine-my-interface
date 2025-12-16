import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "out");
const docsDir = path.join(root, "docs");

if (!fs.existsSync(outDir)) {
  console.error(
    "Expected Next static export output in 'out/'.\n" +
      "Run: npm run build\n" +
      "(and ensure next.config.ts has output: 'export')"
  );
  process.exit(1);
}

// Replace docs/ with the exported site
fs.rmSync(docsDir, { recursive: true, force: true });
fs.cpSync(outDir, docsDir, { recursive: true });

// GitHub Pages needs this to serve Next's _next/ folder as-is
fs.writeFileSync(path.join(docsDir, ".nojekyll"), "");

console.log("GitHub Pages output written to docs/");
