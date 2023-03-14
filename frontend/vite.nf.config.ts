import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: resolve(__dirname),
  publicDir: false,
  build: {
    lib: {
      name: "nf",
      formats: ["iife"],
      entry: "src/extension/nf.ts",
      fileName: "nf", // becomes nf.iife.js
    },
    outDir: resolve(__dirname),
  },
});
