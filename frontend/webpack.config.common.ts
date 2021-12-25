import * as path from "path";
import * as webpack from "webpack";
// in case you run into any typescript error when configuring `devServer`
import "webpack-dev-server";
import { WebpackPluginServe } from "webpack-plugin-serve";

import { GitRevisionPlugin } from "git-revision-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CircularDependencyPlugin from "circular-dependency-plugin";
import { InjectManifest } from "workbox-webpack-plugin";

export function config(): webpack.Configuration {
  return {
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
    ],
  };
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

export function injectManifest(
  { limit }: { limit: number } = { limit: 100 },
): webpack.Configuration {
  return {
    plugins: [
      new InjectManifest({
        swSrc: "./src/service-worker.ts",
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

export function devServer(path = "./dist"): webpack.Configuration {
  return {
    watch: true,
    plugins: [
      new WebpackPluginServe({
        port: process.env.PORT || 5000,
        static: path,
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

export function generateSourceMaps({ type }: { type: string }): webpack.Configuration {
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
          use: ["@svgr/webpack", "asset"],
        },
      ],
    },
  };
}

export function loadSVG(): webpack.Configuration {
  return {
    module: {
      rules: [
        {
          test: /\.svg$/,
          use: ["asset"],
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
