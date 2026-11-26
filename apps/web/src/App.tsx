import { Outlet } from "react-router";
import { Footer } from "./components/navigation/Footer";
import { Header } from "./components/navigation/Header";
import { ToastRegion } from "./views/ToastRegion";

/** Root layout: header, the current screen, footer. The column fills the window so the footer sits at the bottom. */
export function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
      <ToastRegion />
    </div>
  );
}
