import { crx } from "@crxjs/vite-plugin";
import replace, { RollupReplaceOptions } from "@rollup/plugin-replace";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import rollupNodePolyFill from "rollup-plugin-node-polyfills";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import manifest from "./manifest.config";

const mode = process.env.NODE_ENV === "development" ? "development" : "production";

const replaceOptions: RollupReplaceOptions = {
  __DATE__: new Date().toISOString(),
  preventAssignment: true,
};

export default defineConfig({
  envDir: resolve(__dirname),
  build: {
    target: "esnext",
    outDir: resolve(__dirname, "extbuild"),
    sourcemap: process.env.SOURCE_MAP === "true",
    rollupOptions: {
      plugins: [
        // @ts-ignore
        rollupNodePolyFill(),
      ],
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
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    host: "0.0.0.0",
    hmr: {
      port: 5555,
    },
  },
  plugins: [
    svgr(),
    react(),
    // @ts-ignore
    replace(replaceOptions),
    crx({ manifest }),
  ],
});
