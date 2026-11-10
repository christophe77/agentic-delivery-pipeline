#!/usr/bin/env node
// PreToolUse guard: prevents the agent from reading secret files,
// writing a secret into the code, or running sensitive commands.
// Exit 2 = call blocked, the stderr message is sent back to Claude.

import { readFileSync } from "node:fs";

const SECRET_FILES = [
  /(^|[\\/])\.env(\.(?!example$|sample$|template$|dist$)[^\\/]+)?$/i,
  /\.(pem|key|pfx|p12|jks|keystore)$/i,
  /(^|[\\/])id_(rsa|ed25519|ecdsa)(\.pub)?$/i,
  /(^|[\\/])\.aws[\\/]credentials$/i,
  /(^|[\\/])secrets\.json$/i,
  /(^|[\\/])\.npmrc$/i,
  /(^|[\\/])[^\\/]*secret[^\\/]*\.(md|txt|json|ya?ml)$/i,
];

const SECRET_CONTENT = [
  ["AWS access key", /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["Anthropic key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["GitHub token", /\b(ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}/],
  ["Stripe live key", /\b(sk|rk)_live_[A-Za-z0-9]{20,}/],
  ["Slack token", /\bxox[abposr]-[A-Za-z0-9-]{10,}/],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
];

const DANGEROUS_COMMANDS = [
  ["reading a .env file", /\b(cat|type|more|less|head|tail|Get-Content|gc|bat)\b[^|;&]*\.env\b(?!\.(example|sample|template))/i],
  ["dumping environment variables", /(^|[;&|]\s*)(printenv|env|set|Get-ChildItem\s+env:|gci\s+env:|dir\s+env:)\s*($|[;&|])/i],
  ["configuring AWS credentials", /\baws\s+(configure|sts\s+get-session-token|iam\s+create-access-key)\b/i],
  ["manual production deployment", /\b(cdk\s+deploy|terraform\s+apply|serverless\s+deploy|sam\s+deploy)\b[^\n]*\bprod/i],
  ["production AWS profile", /--profile[= ]\S*prod/i],
  ["modifying GitHub secrets", /\bgh\s+secret\s+(set|delete)\b/i],
  ["force push", /\bgit\s+push\b[^\n]*\s(--force|-f)(\s|$)/i],
  ["direct push to the main branch", /\bgit\s+push\b[^\n]*\s(\S+:)?(main|master)(\s|$)/i],
];

function block(reason) {
  process.stderr.write(
    `[agentic guard] Blocked: ${reason}. Secrets stay out of the agent's reach ` +
      `(GitHub Secrets, AWS OIDC, environment variables). Ask the user to do it themselves if needed.\n`
  );
  process.exit(2);
}

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // unreadable input: do not block
}

const tool = input.tool_name ?? "";
const args = input.tool_input ?? {};

if (["Read", "Edit", "Write", "MultiEdit"].includes(tool)) {
  const path = String(args.file_path ?? "");
  // Workflow files (e.g. secret-scan.yml) only reference secrets by name: never blocked.
  const isWorkflow = /(^|[\\/])\.github[\\/]workflows[\\/][^\\/]+\.ya?ml$/i.test(path);
  const hit = !isWorkflow && SECRET_FILES.find((re) => re.test(path));
  if (hit) block(`access to the sensitive file ${path.split(/[\\/]/).pop()}`);
}

if (["Edit", "Write", "MultiEdit"].includes(tool)) {
  const text = [args.content, args.new_string, ...(args.edits ?? []).map((e) => e.new_string)]
    .filter(Boolean)
    .join("\n");
  for (const [label, re] of SECRET_CONTENT) {
    if (re.test(text)) block(`the written content looks like a ${label}`);
  }
}

if (tool === "Bash" || tool === "PowerShell") {
  const cmd = String(args.command ?? "");
  for (const [label, re] of DANGEROUS_COMMANDS) {
    if (re.test(cmd)) block(label);
  }
}

process.exit(0);
