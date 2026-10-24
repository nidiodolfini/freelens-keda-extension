import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vite's built-in transform handles the JSX of the component tests with the
// automatic runtime, the same transform the electron-vite build uses for the
// renderer, so no React plugin is needed.
export default defineConfig({
  test: {
    // Default to a Node environment. Tests that render React components opt into
    // jsdom per-file with a `// @vitest-environment jsdom` comment at the top.
    environment: "node",
    // Tests import describe, it, expect, vi and the hooks from "vitest"; no
    // tsconfig declares them as globals. `globals` is on at runtime because
    // React Testing Library registers its automatic `afterEach(cleanup)` only
    // when `afterEach` exists as a global.
    globals: true,
    exclude: ["node_modules/**", "out/**"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
    alias: {
      // The host provides `@freelensapp/extensions` as a global, and the real
      // package is the Freelens host renderer bundle which needs a browser, so
      // it cannot be imported under Node. Tests import a small stub instead -
      // see `test/freelens-extensions.ts`.
      "@freelensapp/extensions": fileURLToPath(new URL("./test/freelens-extensions.ts", import.meta.url)),
    },
  },
});
