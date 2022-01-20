import { StrictMode } from "react";
import ReactDOM from "react-dom";
import { CssBaseline } from "@material-ui/core";
import "./index.css";
import App from "./App";
import { store } from "./app/createStore";
import { Provider } from "react-redux";

ReactDOM.render(
  <StrictMode>
    <CssBaseline />
    <Provider store={store}>
      <App componentsConfig={window.componentsConfig} />
    </Provider>
  </StrictMode>,
  document.getElementById("root"),
);
