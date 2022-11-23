import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import replace, { RollupReplaceOptions } from "@rollup/plugin-replace";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import rollupNodePolyFill from "rollup-plugin-node-polyfills";
import { defineConfig } from "vite";
import type { ManifestOptions, VitePWAOptions } from "vite-plugin-pwa";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

const mode = process.env.NODE_ENV === "development" ? "development" : "production";

const pwaOptions: Partial<VitePWAOptions> = {
  mode: mode,
  base: "/",
  includeAssets: ["static/favicon.ico"],
  manifest: {
    name: "Transcrobes",
    short_name: "Transcrobes",
    theme_color: "#ffffff",
    icons: [
      {
        src: "static/tc16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: "static/tc128.png",
        sizes: "128x128",
        type: "image/png",
      },
    ],
  },
  devOptions: {
    enabled: process.env.SW_DEV === "true",
    /* when using generateSW the PWA plugin will switch to classic */
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
const claims = true; // process.env.CLAIMS === "true";
const reload = true; // process.env.RELOAD_SW === "true";
const selfDestroying = process.env.SW_DESTROY === "true";

if (process.env.SW === "true") {
  pwaOptions.srcDir = "src/sw";
  pwaOptions.filename = "service-worker.ts";
  pwaOptions.strategies = "injectManifest";
  pwaOptions.scope = "/";
  (pwaOptions.manifest as Partial<ManifestOptions>).name = "Transcrobes";
  (pwaOptions.manifest as Partial<ManifestOptions>).short_name = "Transcrobes";
  pwaOptions.mode = mode === "development" ? "development" : "production";
}

if (claims) pwaOptions.registerType = "autoUpdate";

// unused
if (reload) {
  replaceOptions.__RELOAD_SW__ = "true";
}

if (selfDestroying) pwaOptions.selfDestroying = selfDestroying;

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
    // headers: { "Service-Worker-Allowed": "/", },
    port: 5000,
    host: "0.0.0.0",
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
      },
      // Enable esbuild polyfill plugins
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }),
        NodeModulesPolyfillPlugin(),
      ],
    },
  },
  plugins: [
    svgr(),
    react(),
    VitePWA(pwaOptions),
    // @ts-ignore
    replace(replaceOptions),
  ],
});
