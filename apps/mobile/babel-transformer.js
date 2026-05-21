// Custom Babel transformer for Metro.
// Strips the dynamic import('@opentelemetry/api') pattern from
// @supabase/supabase-js that Hermes cannot compile.
const upstreamTransformer = require("@expo/metro-config/babel-transformer");

module.exports.transform = function ({ src, filename, options }) {
  // Only transform @supabase packages to keep builds fast
  if (
    filename.includes("node_modules/@supabase") ||
    filename.includes("node_modules\\@supabase")
  ) {
    // Replace: import(OTEL_PKG).catch(...) with Promise.resolve({})
    src = src.replace(
      /import\s*\(\s*\/\*[^*]*\*\/\s*(?:\/\*[^*]*\*\/\s*)*OTEL_PKG\s*\)\s*\.\s*catch\s*\(\s*\(\)\s*=>\s*\(\s*\{\s*\}\s*\)\s*\)\s*;?/g,
      "Promise.resolve({});"
    );
  }

  return upstreamTransformer.transform({ src, filename, options });
};