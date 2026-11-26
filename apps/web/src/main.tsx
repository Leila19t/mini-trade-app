import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router/dom";
import { queryClient } from "./data/queryClient";
import { priceSocket } from "./data/socket";
import { store } from "./data/store";
import { router } from "./router";
import "./tokens.css";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error('index.html is missing <div id="root">');

// One socket for the app's lifetime, opened before React renders.
priceSocket.connect();

createRoot(root).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);
