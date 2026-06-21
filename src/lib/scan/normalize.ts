// Canonicalize source content before hashing so that cosmetic edits
// (trailing whitespace, extra blank lines, frontmatter tweaks) do not
// produce false-positive change detections.

const FRONTMATTER_RE = /^---\s*\n[\s\S]*?\n---\s*\n?/;

export function normalize(content: string): string {
  return content
    .replace(/^﻿/, "")               // strip BOM if present
    .replace(FRONTMATTER_RE, "")          // drop YAML/TOML frontmatter
    .replace(/\r\n?/g, "\n")              // unify line endings
    .replace(/[ \t]+$/gm, "")             // strip trailing whitespace per line
    .replace(/\n{3,}/g, "\n\n")           // collapse runs of blank lines
    .trim() + "\n";
}
