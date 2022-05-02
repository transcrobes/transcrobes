import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { CssBaseline } from "@mui/material";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./app/createStore";
import "./index.css";

export const muiCache = createCache({
  key: "mui",
  prepend: true,
});

createRoot(document.getElementById("root")!).render(
  // FIXME: turn on StrictMode when the new react-beautiful-dnd is released
  // <StrictMode>
  <Provider store={store}>
    <CssBaseline />
    <CacheProvider value={muiCache}>
      <App config={window.componentsConfig} />
    </CacheProvider>
  </Provider>,
  //   </StrictMode>,
);
