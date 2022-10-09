import { StyledEngineProvider } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "../app/createStore";
import Options from "./Options";

const container = document.getElementById("root");
createRoot(container!).render(
  <StrictMode>
    <Provider store={store}>
      <StyledEngineProvider injectFirst>
        <Options />
      </StyledEngineProvider>
    </Provider>
  </StrictMode>,
);
