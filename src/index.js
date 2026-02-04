import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { RecoilRoot } from "recoil";
import { APIProvider } from "@vis.gl/react-google-maps";

// 👇 Add this at the very top of index.js or main.jsx
function applyInverseZoom() {
  const zoom = window.devicePixelRatio;  // browser zoom detect
  const scale = 1 / zoom;                // invert zoom
  document.documentElement.style.setProperty("--inv-zoom", scale);
}

applyInverseZoom();
window.addEventListener("resize", applyInverseZoom);


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