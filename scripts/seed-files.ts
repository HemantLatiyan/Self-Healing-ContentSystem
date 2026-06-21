// Restore the working source files to their v1 baseline.
// Run after `db:reset` (or any time you want to undo a v2 promotion).

import { copyFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "seeds", "sources");
const v1s = readdirSync(dir).filter((f) => f.endsWith("_v1.md"));

for (const v1 of v1s) {
  const unsuffixed = v1.replace(/_v1\.md$/, ".md");
  copyFileSync(join(dir, v1), join(dir, unsuffixed));
  console.log(`reset ${unsuffixed} ← ${v1}`);
}
