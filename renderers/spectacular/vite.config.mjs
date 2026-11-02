// Builds web/public/vendor/spectacular/spectacular.js: the viewer, its worker and the
// crossfilter WASM in one ES module. Run with spectacular's own vite (see build.mjs), so
// this file imports nothing.
import { resolve } from "node:path";

const viz = resolve(process.env.SPECTACULAR, "packages/viz");

export default {
  root: import.meta.dirname,
  resolve: { alias: { "@spectacular/viz/src": resolve(viz, "src"), "@spectacular/viz": resolve(viz, "src/index.ts") } },
  // Inline the WASM into the worker and the worker into the module: one file, no fetches.
  build: {
    outDir: resolve(import.meta.dirname, "../../web/public/vendor/spectacular"),
    emptyOutDir: false,
    assetsInlineLimit: 4 * 1024 * 1024,
    lib: { entry: resolve(import.meta.dirname, "src/desk.ts"), formats: ["es"], fileName: () => "spectacular.js" },
  },
  worker: { format: "es" },
  server: { fs: { allow: [viz] } },
};
