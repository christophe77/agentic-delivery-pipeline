#!/usr/bin/env node
// Garde-fou PreToolUse : empêche l'agent de lire des fichiers de secrets,
// d'écrire un secret dans le code, ou de lancer des commandes sensibles.
// Exit 2 = appel bloqué, le message stderr est renvoyé à Claude.

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
  ["clé d'accès AWS", /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["clé Anthropic", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["token GitHub", /\b(ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}/],
  ["clé Stripe live", /\b(sk|rk)_live_[A-Za-z0-9]{20,}/],
  ["token Slack", /\bxox[abposr]-[A-Za-z0-9-]{10,}/],
  ["clé privée", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
];

const DANGEROUS_COMMANDS = [
  ["lecture d'un fichier .env", /\b(cat|type|more|less|head|tail|Get-Content|gc|bat)\b[^|;&]*\.env\b(?!\.(example|sample|template))/i],
  ["dump des variables d'environnement", /(^|[;&|]\s*)(printenv|env|set|Get-ChildItem\s+env:|gci\s+env:|dir\s+env:)\s*($|[;&|])/i],
  ["configuration d'identifiants AWS", /\baws\s+(configure|sts\s+get-session-token|iam\s+create-access-key)\b/i],
  ["déploiement production manuel", /\b(cdk\s+deploy|terraform\s+apply|serverless\s+deploy|sam\s+deploy)\b[^\n]*\bprod/i],
  ["profil AWS production", /--profile[= ]\S*prod/i],
  ["modification des secrets GitHub", /\bgh\s+secret\s+(set|delete)\b/i],
  ["push forcé", /\bgit\s+push\b[^\n]*\s(--force|-f)(\s|$)/i],
  ["push direct sur la branche principale", /\bgit\s+push\b[^\n]*\s(\S+:)?(main|master)(\s|$)/i],
];

function block(reason) {
  process.stderr.write(
    `[agentic guard] Bloqué : ${reason}. Les secrets restent hors de portée de l'agent ` +
      `(GitHub Secrets, OIDC AWS, variables d'environnement). Demande à l'utilisateur d'agir lui-même si nécessaire.\n`
  );
  process.exit(2);
}

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // entrée illisible : on ne bloque pas
}

const tool = input.tool_name ?? "";
const args = input.tool_input ?? {};

if (["Read", "Edit", "Write", "MultiEdit"].includes(tool)) {
  const path = String(args.file_path ?? "");
  const hit = SECRET_FILES.find((re) => re.test(path));
  if (hit) block(`accès au fichier sensible ${path.split(/[\\/]/).pop()}`);
}

if (["Edit", "Write", "MultiEdit"].includes(tool)) {
  const text = [args.content, args.new_string, ...(args.edits ?? []).map((e) => e.new_string)]
    .filter(Boolean)
    .join("\n");
  for (const [label, re] of SECRET_CONTENT) {
    if (re.test(text)) block(`le contenu écrit ressemble à un(e) ${label}`);
  }
}

if (tool === "Bash" || tool === "PowerShell") {
  const cmd = String(args.command ?? "");
  for (const [label, re] of DANGEROUS_COMMANDS) {
    if (re.test(cmd)) block(label);
  }
}

process.exit(0);
