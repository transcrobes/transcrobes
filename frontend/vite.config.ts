import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import replace, { RollupReplaceOptions } from "@rollup/plugin-replace";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import rollupNodePolyFill from "rollup-plugin-node-polyfills";
import { defineConfig } from "vite";
import type { VitePWAOptions } from "vite-plugin-pwa";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";
import wasm from "vite-plugin-wasm";

const mode = process.env.NODE_ENV === "development" ? "development" : "production";

const pwaOptions: Partial<VitePWAOptions> = {
  srcDir: "src/workers",
  filename: "service-worker.ts",
  strategies: "injectManifest",
  scope: "/",
  registerType: "autoUpdate",
  mode: mode,
  base: "/",

  includeAssets: ["static/favicon.ico"],
  injectManifest: {
    maximumFileSizeToCacheInBytes: 20000000,
  },
  manifest: {
    short_name: "Transcrobes",
    name: "Transcrobes Language Learning Platform",
    description:
      "Use the Transcrobes platform to learn Chinese and English. Read books and watch videos. Practice important vocabulary. Read any text with personalised help.",
    icons: [
      {
        src: "/static/favicon.ico",
        sizes: "16x16",
        type: "image/x-icon",
      },
      {
        src: "/static/tc128.png",
        type: "image/png",
        sizes: "128x128",
      },
      {
        src: "/static/tc192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        src: "/static/tc512.png",
        type: "image/png",
        sizes: "512x512",
      },
      {
        src: "/static/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      // @ts-ignore - this is a valid shortcut
      {
        name: "Repetrobes",
        url: "/#/repetrobes",
        description: "Practice important vocabulary",
      },
      // @ts-ignore
      {
        name: "Textcrobes",
        url: "/#/textcrobes",
        description: "Read any text with personalised help",
      },
      // @ts-ignore
      {
        name: "Content",
        url: "/#/contents",
        description: "Read books and watch videos",
      },
    ],
    categories: ["language learning", "Chinese", "English", "education"],
    start_url: "/#/",
    display: "standalone",
    theme_color: "#000000",
    background_color: "#ffffff",
    orientation: "portrait-primary",
    dir: "ltr",
    scope: "/",
  },
  devOptions: {
    enabled: process.env.SW_DEV === "true",
    type: "module",
    navigateFallback: "index.html",
  },
};

const fakeHash = Date.now().toString();

const replaceOptions: RollupReplaceOptions = {
  __DATE__: new Date().toISOString(),
  __FAKE_HASH__: fakeHash,
  preventAssignment: true,
};
const selfDestroying = process.env.SW_DESTROY === "true";

replaceOptions.__RELOAD_SW__ = "true";

if (selfDestroying) pwaOptions.selfDestroying = selfDestroying;

// @ts-ignore
export default defineConfig({
  build: {
    sourcemap: process.env.SOURCE_MAP === "true",
    rollupOptions: {
      plugins: [
        // @ts-ignore
        rollupNodePolyFill(),
      ],
      input: {
        main: resolve(__dirname, "index.html"),
        readium: resolve(__dirname, "src/contents/boocrobes/index.html"),
        browsercheck: resolve(__dirname, "unsupported.html"),
      },
      output: {
        format: "es",
        // assetFileNames: "site/[name].[ext]",
        entryFileNames: `[name].${fakeHash}.js`,
      },
    },
  },
  resolve: {
    alias: {
      inferno: mode === "development" ? "inferno/dist/index.dev.esm.js" : "inferno/dist/index.esm.js",
      // This Rollup aliases are extracted from @esbuild-plugins/node-modules-polyfill,
      // see https://github.com/remorses/esbuild-plugins/blob/master/node-modules-polyfill/src/polyfills.ts
      util: "rollup-plugin-node-polyfills/polyfills/util",
      sys: "util",
      events: "rollup-plugin-node-polyfills/polyfills/events",
      stream: "rollup-plugin-node-polyfills/polyfills/stream",
      path: "rollup-plugin-node-polyfills/polyfills/path",
      querystring: "rollup-plugin-node-polyfills/polyfills/qs",
      punycode: "rollup-plugin-node-polyfills/polyfills/punycode",
      url: "rollup-plugin-node-polyfills/polyfills/url",
      string_decoder: "rollup-plugin-node-polyfills/polyfills/string-decoder",
      http: "rollup-plugin-node-polyfills/polyfills/http",
      https: "rollup-plugin-node-polyfills/polyfills/http",
      os: "rollup-plugin-node-polyfills/polyfills/os",
      assert: "rollup-plugin-node-polyfills/polyfills/assert",
      constants: "rollup-plugin-node-polyfills/polyfills/constants",
      _stream_duplex: "rollup-plugin-node-polyfills/polyfills/readable-stream/duplex",
      _stream_passthrough: "rollup-plugin-node-polyfills/polyfills/readable-stream/passthrough",
      _stream_readable: "rollup-plugin-node-polyfills/polyfills/readable-stream/readable",
      _stream_writable: "rollup-plugin-node-polyfills/polyfills/readable-stream/writable",
      _stream_transform: "rollup-plugin-node-polyfills/polyfills/readable-stream/transform",
      timers: "rollup-plugin-node-polyfills/polyfills/timers",
      console: "rollup-plugin-node-polyfills/polyfills/console",
      vm: "rollup-plugin-node-polyfills/polyfills/vm",
      zlib: "rollup-plugin-node-polyfills/polyfills/zlib",
      tty: "rollup-plugin-node-polyfills/polyfills/tty",
      domain: "rollup-plugin-node-polyfills/polyfills/domain",
      buffer: "rollup-plugin-node-polyfills/polyfills/buffer-es6",
      process: "rollup-plugin-node-polyfills/polyfills/process-es6",
    },
  },
  server: {
    port: 5000,
    host: "0.0.0.0",
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
        "process.env.NODE_DEBUG": "false",
      },
      // @ts-ignore
      plugins: [NodeModulesPolyfillPlugin()],
    },
    exclude: ["wa-sqlite"],
  },
  plugins: [svgr(), react(), wasm(), VitePWA(pwaOptions), replace(replaceOptions)],
});
