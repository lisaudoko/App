#!/usr/bin/env node
/**
 * Rewrites Replit's internal npm proxy URLs in package-lock.json back to the
 * public npm registry. Replit's package firewall can write URLs like
 * http://package-firewall.replit.local/npm/... into the lockfile during
 * `npm install`; EAS build servers can't reach that proxy, so remote builds
 * fail during "Install dependencies". Running this after every install keeps
 * the lockfile portable.
 */
const fs = require('fs');
const path = require('path');

const lockfilePath = path.join(__dirname, '..', 'package-lock.json');

if (!fs.existsSync(lockfilePath)) {
  console.log('[fix-lockfile] No package-lock.json found, nothing to do.');
  process.exit(0);
}

const original = fs.readFileSync(lockfilePath, 'utf8');
const pattern = /https?:\/\/package-firewall\.replit\.local\/npm\//g;
const matches = original.match(pattern);

if (!matches) {
  console.log('[fix-lockfile] Lockfile is clean, no Replit proxy URLs found.');
  process.exit(0);
}

const fixed = original.replace(pattern, 'https://registry.npmjs.org/');
fs.writeFileSync(lockfilePath, fixed);
console.log(
  `[fix-lockfile] Rewrote ${matches.length} Replit proxy URL(s) to https://registry.npmjs.org/`
);
