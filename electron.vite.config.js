import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import sassDts from "vite-plugin-sass-dts";
import { globalExternals } from "./build/global-externals.js";

// Modules provided by the Node.js/Electron runtime in the Freelens host. They
// must stay external (left as `require(...)`) instead of being bundled. We list
// them explicitly because setting `rolldownOptions` opts out of the
// `rollupOptions.external` that electron-vite would otherwise apply.
const runtimeExternals = ["electron", /^electron\//, ...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

// NOTE: unlike the fluxcd extension, this config does not use
// `@vitejs/plugin-react`: its ES module graph has top-level `await`, so the
// CommonJS config loader cannot `require()` it in the sandbox, and Vite
// already transforms the JSX of the renderer with its built-in automatic
// runtime (`react/jsx-runtime`, mapped to the host global below). The plugin
// stays a devDependency for `vitest.config.ts`.

export default defineConfig({
  // main process has full access to Node.js APIs
  main: {
    build: {
      lib: {
        entry: resolve(__dirname, "src/main/index.ts"),
        // Freelens 1.xx extensions are CommonJS modules
        formats: ["cjs"],
      },
      rolldownOptions: {
        external: runtimeExternals,
        output: {
          // silence warning about using `chunk.default` to access the default export
          exports: "named",
          // prefer separate files for each module
          preserveModules: (process.env.VITE_PRESERVE_MODULES ?? "true") === "true",
          preserveModulesRoot: "src/main",
        },
      },
      sourcemap: true,
    },
    oxc: {
      decorator: {
        legacy: true,
        emitDecoratorMetadata: true,
      },
    },
    plugins: [
      globalExternals({
        // the modules are provided by the host app as a global variable
        "@freelensapp/extensions": "global.LensExtensions",
        mobx: "global.Mobx",
      }),
    ],
  },
  // The renderer entry is built in the preload section, which needs no HTML
  // entry and shares the CommonJS output of Freelens 1.xx extensions.
  preload: {
    build: {
      lib: {
        entry: resolve(__dirname, "src/renderer/index.tsx"),
        // Freelens 1.xx extensions are CommonJS modules
        formats: ["cjs"],
      },
      outDir: "out/renderer",
      rolldownOptions: {
        external: runtimeExternals,
        output: {
          // silence warning about using `chunk.default` to access the default export
          exports: "named",
          // prefer separate files for each module
          preserveModules: (process.env.VITE_PRESERVE_MODULES ?? "true") === "true",
          preserveModulesRoot: "src/renderer",
        },
      },
      sourcemap: true,
    },
    css: {
      modules: {
        localsConvention: "camelCaseOnly",
      },
    },
    oxc: {
      decorator: {
        legacy: true,
        emitDecoratorMetadata: true,
      },
    },
    plugins: [
      sassDts({
        enabledMode: ["development", "production"],
      }),
      globalExternals({
        // the modules are provided by the host app as a global variable
        "@freelensapp/extensions": "global.LensExtensions",
        mobx: "global.Mobx",
        "mobx-react": "global.MobxReact",
        react: "global.React",
        "react-dom": "global.ReactDom",
        "react-router-dom": "global.ReactRouterDom",
        "react/jsx-runtime": "global.ReactJsxRuntime",
      }),
    ],
  },
});
