#!/bin/bash
set -e

cd mobile

# Install dependencies (node_modules can be stale/wiped between sessions)
npm install --no-audit --no-fund

# Safety net: strip Replit-internal proxy URLs from the lockfile —
# EAS build servers can't reach package-firewall.replit.local
sed -i 's|http://package-firewall.replit.local/npm/|https://registry.npmjs.org/|g' package-lock.json
