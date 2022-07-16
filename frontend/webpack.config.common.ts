import CircularDependencyPlugin from "circular-dependency-plugin";
import Dotenv from "dotenv-webpack";
import { GitRevisionPlugin } from "git-revision-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import * as path from "path";
import TerserPlugin from "terser-webpack-plugin";
import * as webpack from "webpack";
import "webpack-dev-server";
import { WebpackPluginServe } from "webpack-plugin-serve";
import { InjectManifest } from "workbox-webpack-plugin";

export function config(mode: "production" | "development"): webpack.Configuration {
  const out: webpack.Configuration = {
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
      fallback: {
        // this is required for rxdb 10
        fs: false,
        tls: false,
        net: false,
        path: false,
        zlib: false,
        http: false,
        https: false,
        stream: false,
        crypto: false,
      },
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: "process/browser",
      }),

      new Dotenv({
        path: `./.env.${mode}.local`,
        allowEmptyValues: true, // allow empty variables (e.g. `FOO=`) (treat it as empty string, rather than missing)
        systemvars: true, // load all the predefined 'process.env' variables which will trump anything local per dotenv specs.
        silent: false, // hide any errors
      }),
    ],
  };
  if (mode === "development") {
    out.resolve.alias = out.resolve.alias || {};
    out.resolve.alias["inferno"] = "inferno/dist/index.dev.esm.js";
  }
  return out;
}

export function splitChunks(): webpack.Configuration {
  throw new Error("This is COMPLETELY BROKEN and causes random side effects");
  return {
    optimization: {
      splitChunks: {
        cacheGroups: {
          commons: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            chunks: "initial" as "initial" | "all" | "async",
          },
        },
      },
    },
  };
}

export function checkCircularDependencies(): webpack.Configuration {
  return {
    plugins: [
      new CircularDependencyPlugin({
        // exclude detection of files based on a RegExp
        exclude: /a\.js|node_modules/,
        // include specific files based on a RegExp
        include: /src/,
        // add errors to webpack instead of warnings
        failOnError: true,

        // allow import cycles that include an asyncronous import,
        // e.g. via import(/* webpackMode: "weak" */ './file.js')
        allowAsyncCycles: false,
        // set the current working directory for displaying module paths
        cwd: process.cwd(),
      }),
    ],
  };
}

export function injectManifest({ limit }: { limit: number } = { limit: 100 }): webpack.Configuration {
  return {
    plugins: [
      new InjectManifest({
        swSrc: "./src/sw/service-worker.ts",
        dontCacheBustURLsMatching: /.*\.css$|.*\.woff2?$/,
        maximumFileSizeToCacheInBytes: limit * 1024 * 1024,
      }),
    ],
  };
}

export function clean(): webpack.Configuration {
  return {
    output: {
      clean: true,
    },
  };
}

export function devServer(outpath = "./dist"): webpack.Configuration {
  return {
    watch: true,
    plugins: [
      new WebpackPluginServe({
        port: process.env.PORT || 5000,
        static: path.resolve(outpath + "/site"),
        liveReload: true,
        waitForBuild: true,
      }),
    ],
  };
}

export function page({ title }: { title: string }): webpack.Configuration {
  return {
    plugins: [new HtmlWebpackPlugin({ context: { title } })],
  };
}

export function loadTypescript(src = "src"): webpack.Configuration {
  return {
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          include: path.join(__dirname, src),
          exclude: /node_modules/,
          use: ["ts-loader"],
        },
      ],
    },
  };
}

export function loadCSS(): webpack.Configuration {
  return {
    module: {
      rules: [{ test: /\.css$/, use: ["style-loader", "css-loader"] }],
    },
  };
}

const APP_SOURCE = path.join(__dirname, "src");

export function loadJavaScript(): webpack.Configuration {
  return {
    module: {
      rules: [
        // Consider extracting include as a parameter
        { test: /\.js$/, include: APP_SOURCE, use: "babel-loader" },
      ],
    },
  };
}

export function generateSourceMaps({ type }: { type: string | false }): webpack.Configuration {
  return { devtool: type };
}

export function attachRevision(): webpack.Configuration {
  return {
    plugins: [
      new webpack.BannerPlugin({
        banner: new GitRevisionPlugin().version(),
      }),
    ],
  };
}

export function minifyJavaScript(): webpack.Configuration {
  return {
    optimization: { minimizer: [new TerserPlugin()] },
  };
}

export function loadSVGR(): webpack.Configuration {
  return {
    module: {
      rules: [
        {
          test: /\.svg$/,
          issuer: /\.tsx?$/,
          use: ["@svgr/webpack"],
        },
      ],
    },
  };
}

export function loadFonts(): webpack.Configuration {
  return {
    module: {
      rules: [
        {
          test: /\.(otf|ttf)$/,
          type: "asset/resource",
        },
      ],
    },
  };
}

export function loadImages({ limit }: { limit: number } = { limit: 50000 }): webpack.Configuration {
  return {
    module: {
      rules: [
        {
          test: /\.(jpg|jpeg|png|gif|mp3)$/,
          type: "asset",
          parser: { dataUrlCondition: { maxSize: limit } },
        },
      ],
    },
  };
}
