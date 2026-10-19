import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Underscore-prefixed names are intentionally unused.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      // The landing page uses hand-tuned <img> tags inside fixed CSS frames (and first-party/Unsplash assets);
      // swapping to next/image would alter the approved layout.
      "@next/next/no-img-element": "off",
      // React-Compiler advisory rules: the page's mount gate and imperative marquee/knob animation code are
      // intentional and must not be restructured.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
