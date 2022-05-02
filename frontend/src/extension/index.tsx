import { createTheme, StyledEngineProvider, ThemeProvider } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "../app/createStore";
import Options from "./Options";

const theme = createTheme({
  palette: {
    mode: "light", // Switching the dark mode on is a single property value change.
  },
});

const container = document.getElementById("root");
createRoot(container!).render(
  <StrictMode>
    <Provider store={store}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <Options />
        </ThemeProvider>
      </StyledEngineProvider>
    </Provider>
  </StrictMode>,
);
