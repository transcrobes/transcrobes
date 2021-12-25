import { StrictMode } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { CssBaseline } from "@material-ui/core";

ReactDOM.render(
  <StrictMode>
    <CssBaseline />
    <App />
  </StrictMode>,
  document.getElementById("root"),
);
