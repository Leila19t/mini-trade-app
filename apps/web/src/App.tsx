import { Outlet } from "react-router";
import { Header } from "./components/navigation/Header";
import { Footer } from "./components/navigation/Footer";

export function App() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}
