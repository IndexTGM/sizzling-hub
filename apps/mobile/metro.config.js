const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Use custom Babel transformer that strips the problematic
// dynamic import(OTEL_PKG) from @supabase/supabase-js
// which Hermes cannot compile.
config.transformer.babelTransformerPath = require.resolve(
  "./babel-transformer.js"
);

module.exports = config;
