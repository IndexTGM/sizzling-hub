// Patches @supabase/supabase-js to use a string literal instead of a
// variable for the @opentelemetry/api dynamic import(). Hermes (the
// default Android JS engine in Expo SDK 56) cannot compile import(variable).
const fs = require("fs");

const file = "node_modules/@supabase/supabase-js/dist/index.mjs";
let content = fs.readFileSync(file, "utf8");

const OLD = /import\s*\(\s*\/\*[^*]*\*\/\s*\/\*[^*]*\*\/\s*\/\*[^*]*\*\/\s*OTEL_PKG\s*\)/;

if (OLD.test(content)) {
  content = content.replace(OLD, 'import("@opentelemetry/api")');
  fs.writeFileSync(file, content);
  console.log("PATCHED: index.mjs");
} else {
  console.log("ALREADY PATCHED or pattern not found");
}