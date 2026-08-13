---
name: EAS lockfile firewall URLs
description: Why mobile/package-lock.json must never contain Replit proxy URLs and how the safeguard works
---
# EAS lockfile firewall URLs

Rule: `mobile/package-lock.json` must only contain `https://registry.npmjs.org/` resolved URLs, never `http://package-firewall.replit.local/npm/...`.

**Why:** Replit's package firewall can rewrite lockfile URLs during `npm install`; EAS build servers can't reach that proxy, so remote builds fail at "Install dependencies". Happened twice before a safeguard was added.

**How to apply:** `mobile/scripts/fix-lockfile.js` rewrites firewall URLs back to the public registry; it runs via the `postinstall` npm script (and manually via `npm run fix-lockfile`). Don't remove the postinstall hook, and keep the safeguard if the lockfile is regenerated.
