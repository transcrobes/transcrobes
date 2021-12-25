import * as parts from "./webpack.config.common";
import * as path from "path";
import { Configuration, DefinePlugin } from "webpack";
import { merge } from "webpack-merge";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyPlugin from "copy-webpack-plugin";

// FIXME: why can't I do an import of this?
const { mode } = require("webpack-nano/argv");

function page({ title }: { title: string }) {
  return {
    plugins: [
      new HtmlWebpackPlugin({
        title: title,
        template: "./src/extension/options.html",
        chunks: ["options"],
        filename: "./options.html",
        // cache: true,
      }),
    ],
  };
}

const commonConfig = merge<Configuration>([
  parts.config(),
  {
    entry: {
      options: ["./src/extension/index.tsx"],
      content: ["./src/extension/content.ts"],
      background: ["./src/extension/background.ts"],
    },
    plugins: [
      new DefinePlugin({
        "process.env.PLATFORM": '"extension"',
      }),
    ],
  },
  {
    output: {
      path: path.resolve(__dirname, "./extdist"),
      filename: "[name]-bundle.js",
    },
  },
  page({ title: "Transcrobes Options" }),
  loadStaticResources("", ""),
  parts.loadCSS(),
  parts.loadTypescript(),
  parts.loadImages(),
  parts.loadSVGR(),
  parts.loadSVG(),
  parts.clean(),
  // parts.attachRevision(),
]);

function loadStaticResources(sourceBase: string, outputDir: string) {
  return {
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: path.join(sourceBase, "src/extension/manifest.json"),
            to: path.join(outputDir, "[name][ext]"),
          },
          {
            from: path.join(sourceBase, "public/*.png"),
            to: path.join(outputDir, "img/[name][ext]"),
          },
          {
            from: "node_modules/@webcomponents/webcomponentsjs/bundles/webcomponents-sd-ce.js",
            to: path.join(outputDir, "[name][ext]"),
          },
        ],
      }),
    ],
  };
}

const developmentConfig = merge<Configuration>([
  parts.generateSourceMaps({ type: "inline-source-map" }),
]);

const productionConfig = merge<Configuration>([
  parts.minifyJavaScript(),
  parts.generateSourceMaps({ type: "source-map" }),
]);

const getConfig = (mode: "production" | "development") => {
  process.env.NODE_ENV = mode;
  switch (mode) {
    case "production":
      return merge(commonConfig, productionConfig, { mode });
    case "development":
      return merge(commonConfig, developmentConfig, { mode });
    default:
      console.error(mode);
      throw new Error(`Trying to use an unknown mode, ${mode}`);
  }
};

console.log(JSON.stringify(getConfig(mode), null, 2));

export default getConfig(mode);
