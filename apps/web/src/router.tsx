import { createBrowserRouter } from "react-router";
import { App } from "./App";
import { MarketsScreen } from "./screens/MarketsScreen";
import { NotFoundScreen } from "./screens/NotFoundScreen";
import { StockDetailScreen } from "./screens/StockDetailScreen";

/** Every URL in the app. Keep paths in sync with `paths` in helpers/constants.ts. */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <MarketsScreen /> },
      { path: "stocks/:symbol", element: <StockDetailScreen /> },
      { path: "*", element: <NotFoundScreen /> },
    ],
  },
]);
