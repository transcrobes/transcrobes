import { ReactElement, StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import Polyglot from "node-polyglot";
import { getMessages } from "./lib/libMethods";
import { getLanguageFromPreferred } from "./lib/funclib";
import { supported, supportMessage, browser } from "./unsupported";

const style = {
  backgroundColor: "rgb(25, 103, 210)",
  blockSize: "46px",
  borderBlockEndColor: "rgb(255, 255, 255)",
  borderBlockStartColor: "rgb(255, 255, 255)",
  borderBottomColor: "rgb(255, 255, 255)",
  borderBottomLeftRadius: "32px",
  borderBottomRightRadius: "32px",
  borderEndEndRadius: "32px",
  borderEndStartRadius: "32px",
  borderInlineEndColor: "rgb(255, 255, 255)",
  borderInlineStartColor: "rgb(255, 255, 255)",
  borderLeftColor: "rgb(255, 255, 255)",
  borderRightColor: "rgb(255, 255, 255)",
  borderStartEndRadius: "32px",
  borderStartStartRadius: "32px",
  borderTopColor: "rgb(255, 255, 255)",
  borderTopLeftRadius: "32px",
  borderTopRightRadius: "32px",
  caretColor: "rgb(255, 255, 255)",
  color: "rgb(255, 255, 255)",
  columnRuleColor: "rgb(255, 255, 255)",
  cursor: "pointer",
  fontWeight: "500",
  height: "46px",
  inlineSize: "186.281px",
  lineHeight: "24px",
  marginBlockEnd: "8px",
  marginBottom: "8px",
  outlineColor: "rgb(255, 255, 255)",
  paddingBlockEnd: "12px",
  paddingBlockStart: "12px",
  paddingBottom: "12px",
  paddingInlineEnd: "24px",
  paddingInlineStart: "24px",
  paddingLeft: "24px",
  paddingRight: "24px",
  paddingTop: "12px",
  perspectiveOrigin: "93.1406px 23px",
  textDecoration: "none solid rgb(255, 255, 255)",
  textDecorationColor: "rgb(255, 255, 255)",
  textEmphasisColor: "rgb(255, 255, 255)",
  transformOrigin: "93.1406px 23px",
  transitionDelay: "0s, 0s",
  transitionDuration: "0s, 0.3s",
  transitionProperty: "background-color, color",
  transitionTimingFunction: "ease, ease",
  width: "205px",
  WebkitTextFillColor: "rgb(255, 255, 255)",
  WebkitTextStrokeColor: "rgb(255, 255, 255)",
  fontFamily: '"Google Sans", arial, sans-serif',
  fontSize: "16px",
};

function App(): ReactElement {
  const polyglot = new Polyglot({ phrases: getMessages(getLanguageFromPreferred(navigator.languages)) });
  useEffect(() => {
    if (supported) {
      location.href = "/#/";
    }
    if (location.hostname.startsWith("qa.") || location.hostname === "transcrobes.localhost") {
      const err = document.getElementById("error_message");
      if (err) {
        err.innerHTML = JSON.stringify(browser) + navigator.languages.join(", ") + navigator.userAgent;
      }
    }
  }, []);

  return (
    <div>
      <h1 style={{ textAlign: "center" }}>{polyglot.t("unsupported.title")}</h1>
      {supportMessage ? (
        <p style={{ textAlign: "center" }}>{polyglot.t(supportMessage)}</p>
      ) : (
        <>
          <p>{polyglot.t("unsupported.message")}</p>
          <p>{polyglot.t("unsupported.message_ios")}</p>
          <p>{polyglot.t("unsupported.message_rest")}</p>
          <p style={{ textAlign: "center" }}>
            <a href="https://www.microsoft.com/edge/download">
              <button style={style}>{polyglot.t("unsupported.button")}</button>
            </a>
          </p>
        </>
      )}
      {(window.location.href.includes("qa.") || window.location.hostname === "transcrobes.localhost") && (
        <>
          <p>{JSON.stringify(browser)}</p>
          <p> {navigator.languages.join(", ")}</p>
          <p>{navigator.userAgent}</p>
        </>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
