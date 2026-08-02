const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package exports resolution so Metro uses CJS builds instead of
// ESM (.mjs) files that contain `import.meta`, which is not supported in
// the Hermes / Metro web runtime.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
