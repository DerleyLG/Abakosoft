import { BrowserRouter } from "react-router-dom";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Suprimir warning de atributo `jsx` inyectado por @tailwindcss/vite en dev
const originalError = console.error.bind(console);
console.error = (...args) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("non-boolean attribute `jsx`")
  )
    return;
  originalError(...args);
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
