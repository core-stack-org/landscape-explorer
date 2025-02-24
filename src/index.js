import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { RecoilRoot } from "recoil";
import { APIProvider } from "@vis.gl/react-google-maps";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <APIProvider apiKey={process.env.REACT_APP_GOOGLE_KEY}>
    <RecoilRoot>
      <App />
    </RecoilRoot>
  </APIProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals