import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import PreviousMeals from "./pages/PreviousMeals.jsx";
import DailyGoals from "./pages/DailyGoals.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  return (
    <Routes>
      {/* Login has its own full-screen layout, no navbar */}
      <Route path="/login" element={<Login />} />

      <Route
        path="/*"
        element={
          <>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/meals" element={<PreviousMeals />} />
              <Route path="/goals" element={<DailyGoals />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </>
        }
      />
    </Routes>
  );
}
