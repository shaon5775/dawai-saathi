// Compare every local file with the GitHub repo (git blob SHA).  node tools/verify_github.mjs
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SKIP = new Set([".wrangler", "node_modules", "ref", "spec-notes", "HANDOVER.md", ".git", "submission"]);
const local = new Map();
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else {
      const buf = readFileSync(p);
      const sha = createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
      local.set(relative(ROOT, p).split(sep).join("/"), sha);
    }
  }
})(ROOT);
const res = await fetch("https://api.github.com/repos/shaon5775/dawai-saathi/git/trees/main?recursive=1");
const tree = await res.json();
const remote = new Map((tree.tree || []).filter((t) => t.type === "blob").map((t) => [t.path, t.sha]));
let ok = 0;
const bad = [];
for (const [path, sha] of local) {
  if (remote.get(path) === sha) ok += 1;
  else bad.push(`${remote.has(path) ? "DIFF" : "MISSING"} ${path}`);
}
for (const path of remote.keys()) if (!local.has(path)) bad.push(`EXTRA ${path}`);
console.log(`ok ${ok}/${local.size}`);
console.log(bad.join("\n") || "all match");
