import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Warn on raw console usage — use @/lib/logger (server) or keep dev-only guards
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Test files may use console freely for output formatting
    files: ["src/__tests__/**"],
    rules: {
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
