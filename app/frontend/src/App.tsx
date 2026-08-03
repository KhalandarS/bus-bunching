import { BrowserRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DriverConsole from "./pages/DriverConsole";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/driver" element={<DriverConsole />} />
      </Routes>
    </BrowserRouter>
  );
}
