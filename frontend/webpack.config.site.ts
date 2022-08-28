import CopyPlugin from "copy-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import * as path from "path";
import { Configuration, DefinePlugin } from "webpack";
import { merge } from "webpack-merge";
import argv from "webpack-nano/argv";
import * as parts from "./webpack.config.common";

const mode = argv["mode"] as "production" | "development";

function page({ title, description }: { title: string; description: string }) {
  return {
    plugins: [
      new HtmlWebpackPlugin({
        context: { title, description },
        template: "./src/index.html",
        chunks: ["main"], // add any chunks you need here (for example, chunk with libraries
      }),
    ],
  };
}

const commonConfig = merge<Configuration>([
  parts.config(mode),
  {
    entry: {
      main: ["./src/index.tsx"],
      readium: ["./src/contents/boocrobes/readium.tsx"],
    },
    plugins: [
      new DefinePlugin({
        "process.env.PLATFORM": '"site"',
      }),
    ],
  },
  {
    output: {
      path: path.resolve(__dirname, "./dist/site"),
      filename: "[name].[fullhash].js",
    },
  },
  page({ title: "Transcrobes", description: "Transcrobes Language Learning Platform" }),
  loadStaticResources("", ""),
  parts.injectManifest({ limit: mode === "development" ? 100 : 15 }),
  parts.loadCSS(),
  parts.loadFonts(),
  parts.loadTypescript(),
  parts.loadImages(),
  parts.loadSVGR(),
  parts.clean(),
]);

function loadStaticResources(sourceBase: string, outputDir: string) {
  return {
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: path.join(sourceBase, "public/**/*.*"),
            to: path.join(outputDir, "../static", "[name][ext]"),
          },
        ],
      }),
    ],
  };
}

const developmentConfig = merge<Configuration>([
  { entry: { main: ["webpack-plugin-serve/client"] } },
  parts.devServer(),
  parts.generateSourceMaps({ type: "eval-source-map" }),
  parts.checkCircularDependencies(),
]);

const productionConfig = merge<Configuration>([
  parts.minifyJavaScript(),
  parts.generateSourceMaps({ type: "source-map" }),
  parts.checkCircularDependencies(),
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

// console.log(JSON.stringify(getConfig(mode), null, 2));

export default getConfig(mode);
