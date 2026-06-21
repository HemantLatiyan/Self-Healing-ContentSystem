// Promote a versioned source file to its working location: `npm run promote -- 1 v2`.
//   `1`  → matches `source1_*` files
//   `v2` → version tag to promote
//
// Used to trigger a change for the demo: `npm run promote -- 1 v2` overwrites
// `source1_exam_guide.md` with `source1_exam_guide_v2.md`. The next scan will
// detect a hash change and create a ChangeSet.

import { copyFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const [, , idxArg, tagArg] = process.argv;
if (!idxArg || !tagArg) {
  console.error("Usage: npm run promote -- <source-index> <version-tag>");
  console.error("Example: npm run promote -- 1 v2");
  process.exit(1);
}

const dir = join(process.cwd(), "seeds", "sources");
const prefix = `source${idxArg}_`;
const candidates = readdirSync(dir).filter(
  (f) => f.startsWith(prefix) && f.endsWith(`_${tagArg}.md`),
);
if (candidates.length === 0) {
  console.error(`No file matching ${prefix}*_${tagArg}.md in ${dir}`);
  process.exit(1);
}

for (const v of candidates) {
  const unsuffixed = v.replace(new RegExp(`_${tagArg}\\.md$`), ".md");
  const target = join(dir, unsuffixed);
  if (!existsSync(join(dir, v))) continue;
  copyFileSync(join(dir, v), target);
  console.log(`promoted ${unsuffixed} ← ${v}`);
}
