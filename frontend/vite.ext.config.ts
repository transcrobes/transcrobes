import { crx } from "@crxjs/vite-plugin";
import replace, { RollupReplaceOptions } from "@rollup/plugin-replace";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import manifest from "./manifest.json";

const mode = process.env.NODE_ENV === "development" ? "development" : "production";

const replaceOptions: RollupReplaceOptions = {
  __DATE__: new Date().toISOString(),
  preventAssignment: true,
};

export default defineConfig({
  // root: resolve(__dirname, "src/extension"),
  envDir: resolve(__dirname),
  build: {
    outDir: resolve(__dirname, "extbuild"),
  },
  plugins: [
    svgr(),
    // react({ jsxRuntime: "classic" }),
    react(),
    // @ts-ignore
    replace(replaceOptions),
    crx({ manifest: manifest }),
  ],
});
