import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { reportWebVitals } from "./utils/vitals";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

reportWebVitals();
