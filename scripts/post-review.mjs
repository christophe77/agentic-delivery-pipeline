#!/usr/bin/env node
// Publishes the review written by Claude (.agentic/runs/review.json) as ONE GitHub
// pull request review: the summary as the review body, the findings as inline
// comments. A review sends one notification, whatever its number of comments.
// Findings on lines outside the diff (GitHub refuses them inline) are moved to
// the summary with a link to the line. The review is always a plain COMMENT:
// never an approval or a change request.
//
// Usage: node post-review.mjs <review.json>
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/repo), PR_NUMBER, HEAD_SHA,
//      GITHUB_API_URL (optional), DRY_RUN=1 (print the payload, post nothing).

import { readFileSync } from "node:fs";

const MAX_BODY = 60000;
const api = process.env.GITHUB_API_URL || "https://api.github.com";
const repo = process.env.GITHUB_REPOSITORY;
const pr = process.env.PR_NUMBER;
const sha = process.env.HEAD_SHA;
const dryRun = process.env.DRY_RUN === "1";

function fail(msg) {
  console.log(`::error::${msg}`);
  process.exit(1);
}

async function gh(path, options = {}) {
  const res = await fetch(`${api}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

// Lines of the PR head (right side) that GitHub accepts inline: added and context lines of each hunk.
export function commentableLines(patch) {
  const lines = new Set();
  let right = 0;
  for (const row of (patch || "").split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(row);
    if (hunk) { right = Number(hunk[1]); continue; }
    if (!right) continue;
    if (row.startsWith("-")) continue;
    if (row.startsWith("\\")) continue; // "\ No newline at end of file"
    lines.add(right);
    right++;
  }
  return lines;
}

export function buildReview(review, filesByPath, links) {
  const inline = [];
  const moved = [];
  for (const c of Array.isArray(review.comments) ? review.comments : []) {
    const path = String(c.path || "").replace(/^\.?\//, "");
    const line = Number(c.line);
    const body = String(c.body || "").trim();
    if (!path || !body) continue;
    const ok = Number.isInteger(line) && filesByPath.get(path)?.has(line);
    if (!ok) { moved.push({ path, line, body }); continue; }
    const comment = { path, line, side: "RIGHT", body };
    const start = Number(c.start_line);
    if (Number.isInteger(start) && start < line && filesByPath.get(path).has(start)) {
      comment.start_line = start;
      comment.start_side = "RIGHT";
    }
    inline.push(comment);
  }
  let body = String(review.summary || "").trim() || "Review: no summary was written.";
  if (moved.length) {
    body += filesByPath.size ? "\n\n### Findings outside the diff\n" : "\n\n### Findings\n";
    for (const m of moved) {
      const where = Number.isInteger(m.line) ? `${m.path}:${m.line}` : m.path;
      const url = Number.isInteger(m.line) ? links(m.path, m.line) : links(m.path);
      body += `\n- [\`${where}\`](${url}): ${m.body.replace(/\n+/g, " ")}`;
    }
  }
  if (body.length > MAX_BODY) body = body.slice(0, MAX_BODY) + "\n\n_(truncated)_";
  return { body, inline, moved };
}

async function main() {
  const file = process.argv[2] || ".agentic/runs/review.json";
  let review;
  try {
    review = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`Claude wrote no valid review (${file}: ${e.code || e.message}). See the claude-review-transcript artifact.`);
  }
  if (!repo || !pr || !sha) fail("GITHUB_REPOSITORY, PR_NUMBER and HEAD_SHA are required.");

  const filesByPath = new Map();
  for (let page = 1; page <= 30; page++) {
    const r = await gh(`/repos/${repo}/pulls/${pr}/files?per_page=100&page=${page}`);
    if (!r.ok) fail(`Cannot list the PR files (HTTP ${r.status}).`);
    for (const f of r.data) filesByPath.set(f.filename, commentableLines(f.patch));
    if (r.data.length < 100) break;
  }
  const links = (path, line) =>
    `https://github.com/${repo}/blob/${sha}/${path.split("/").map(encodeURIComponent).join("/")}${line ? `#L${line}` : ""}`;

  let { body, inline, moved } = buildReview(review, filesByPath, links);
  const payload = { commit_id: sha, event: "COMMENT", body, comments: inline };
  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  let r = await gh(`/repos/${repo}/pulls/${pr}/reviews`, { method: "POST", body: JSON.stringify(payload) });
  if (!r.ok && inline.length) {
    // A comment GitHub still refuses (e.g. a line it does not map): post everything in the summary.
    console.log(`::warning::Inline comments refused (HTTP ${r.status}: ${JSON.stringify(r.data?.errors || r.data?.message)}). Posting them in the summary.`);
    // An empty map makes every finding "outside the diff": all of them go to the summary, with links.
    ({ body, moved } = buildReview(review, new Map(), links));
    inline = [];
    r = await gh(`/repos/${repo}/pulls/${pr}/reviews`, {
      method: "POST",
      body: JSON.stringify({ commit_id: sha, event: "COMMENT", body, comments: [] }),
    });
  }
  if (!r.ok) fail(`Cannot post the review (HTTP ${r.status}: ${JSON.stringify(r.data?.message)}).`);
  console.log(`Review posted on PR #${pr}: ${inline.length} inline comment(s), ${moved.length} finding(s) outside the diff. ${r.data.html_url}`);
}

if (/(^|[\\/])post-review\.mjs$/.test(process.argv[1] || "")) {
  main().catch((e) => fail(`post-review failed: ${e.message}`));
}
