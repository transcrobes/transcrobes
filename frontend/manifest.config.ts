import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json";
const { version } = packageJson;

const [major, minor, patch] = version.replace(/[^\d.-]+/g, "").split(/[.-]/);

export default defineManifest((env) => ({
  manifest_version: 3,
  name: env.mode === "development" ? "[DEV] brocrobes" : "brocrobes",
  version: `${major}.${minor}.${patch}`,
  version_name: version,
  description: "Browser plugin for https://transcrob.es",
  homepage_url: "https://transcrob.es",
  permissions: ["activeTab", "scripting", "contextMenus"],
  host_permissions: ["*://*/*"],
  background: {
    service_worker: "src/extension/background.ts",
    minimum_chrome_version: "100",
  },
  icons: {
    "16": "public/static/tc16.png",
    "32": "public/static/tc32.png",
    "64": "public/static/tc64.png",
    "128": "public/static/tc128.png",
  },
  web_accessible_resources: [
    {
      resources: ["img/*.*", "*.css", "nf.iife.js"],
      matches: ["<all_urls>"],
    },
  ],
  options_page: "src/extension/options.html",
  action: {
    default_title: "Transcrobe Me!",
  },
}));
