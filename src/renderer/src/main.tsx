import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { queryClient as qc } from "./queryClient";
import "./styles.css";
import "./styles/tokens.css";
import "./styles/shell.css";
import "./styles/dock.css";
import "./styles/guide.css";
import "./styles/toast.css";
import "./styles/overrides.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
