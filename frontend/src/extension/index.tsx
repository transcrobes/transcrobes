import { StyledEngineProvider } from "@mui/material";
import { StrictMode } from "react";
import { I18nContextProvider } from "react-admin";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "../app/createStore";
import { getI18nProvider } from "../lib/libMethods";
import Options from "./Options";

const container = document.getElementById("root");
createRoot(container!).render(
  <StrictMode>
    <Provider store={store}>
      <I18nContextProvider value={getI18nProvider()}>
        <StyledEngineProvider injectFirst>
          <Options />
        </StyledEngineProvider>
      </I18nContextProvider>
    </Provider>
  </StrictMode>,
);
