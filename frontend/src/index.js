import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import App from "./App";
import "./index.css";

axios.defaults.withCredentials = true;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

// expose for quick debugging in browser console
window._appRoot = root;