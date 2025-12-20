import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App as AntdApp } from "antd"; 

import App from "./App";
import "./styles/index.css";
import "./styles/themes.css";
import "antd/dist/reset.css";

import { AuthProvider } from "./context/AuthContext";
import QueryProvider from "./providers/QueryProvider";
import ThemeProvider from "./providers/ThemeProvider";

import { axiosInstance, setupInterceptors } from "./api/axios";

setupInterceptors(axiosInstance);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <ThemeProvider>
          <AuthProvider>
            <AntdApp> 
            <App />
            </AntdApp>
          </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </BrowserRouter>
  </React.StrictMode>
);
