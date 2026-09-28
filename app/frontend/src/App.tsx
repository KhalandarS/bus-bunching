import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import Dashboard from "./pages/Dashboard";
import DriverConsole from "./pages/DriverConsole";
import PassengerView from "./pages/PassengerView";

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/driver" element={<DriverConsole />} />
          <Route path="/passenger" element={<PassengerView />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
