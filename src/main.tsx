import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App as AntdApp } from "antd"; 

import App from "./App";
import "./styles/index.css";
import "./styles/themes.css";
import "antd/dist/reset.css";

import { AuthProvider } from "./context/AuthContext";
import QueryProvider from './providers/QueryProvider.tsx';
import ThemeProvider from "./providers/ThemeProvider";

import { axiosInstance, setupInterceptors } from "./api/axios";
import ErrorBoundary from "./components/general/ErrorBoundary";

setupInterceptors(axiosInstance);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
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
    </ErrorBoundary>
  </React.StrictMode>
);
