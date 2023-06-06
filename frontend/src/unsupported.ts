import { detect } from "detect-browser";

export const browser = detect();
export let supported = false;
export let supportMessage = "";
const browserName = browser?.name || "unknown";

const version = parseInt(browser?.version?.split(".")[0] || "0");
const minor = parseInt(browser?.version?.split(".")[1] || "0");

if (["yandexbrowser", "edge-chromium", "chrome"].includes(browserName)) {
  if (version >= 110) {
    supported = true;
  } else if (version >= 99 && navigator.userAgent.toLowerCase().includes("huawei")) {
    // temp testing for huawei
    supported = true;
  } else {
    supportMessage = "unsupported.chrome_version";
  }
} else if (["opera"].includes(browserName)) {
  supported = true;
  if (
    (browser?.os?.toLowerCase().includes("android") && (version > 74 || (version === 74 && minor >= 3))) ||
    version >= 98
  ) {
    supported = true;
  } else {
    supportMessage = "unsupported.opera_version";
  }
} else if (browserName === "firefox") {
  // works pretty well now on both desktop and Android!
  if (version > 111) {
    supported = true;
  } else {
    supportMessage = "unsupported.firefox_version";
  }
} else if (["safari", "ios"].includes(browserName)) {
  // ios safari presents as "ios", as does ios opera (!)
  if (version > 16 || (version === 16 && minor >= 4)) {
    supported = true;
  } else {
    supportMessage = "unsupported.safari_version";
  }
} else if (browserName.endsWith("-webview")) {
  supportMessage = "unsupported.webview_version";
}
