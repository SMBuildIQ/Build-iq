import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Next.js 16 removed the `next lint` CLI command — see
// node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md.
// Run via the plain `eslint` CLI (package.json "lint" script) instead.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"]),
]);

export default eslintConfig;
