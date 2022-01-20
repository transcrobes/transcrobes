import { createTheme, ThemeProvider } from "@material-ui/core";
import { StrictMode } from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { store } from "../app/createStore";
import Options from "./Options";

const theme = createTheme({
  palette: {
    type: "light", // Switching the dark mode on is a single property value change.
  },
});

ReactDOM.render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <Options />
      </ThemeProvider>
    </Provider>
  </StrictMode>,
  document.getElementById("root"),
);
