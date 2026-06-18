import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import BrowsePage from "./pages/BrowsePage";
import RestaurantDetailPage from "./pages/RestaurantDetailPage";
import FloorPlanPage from "./pages/FloorPlanPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import LookupPage from "./pages/LookupPage";
import AdminPage from "./pages/AdminPage";
import ManagerDashboardPage from "./pages/ManagerDashboardPage";
import ManagerSettingsPage from "./pages/ManagerSettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
          <Route path="/restaurant/:id/tables" element={<FloorPlanPage />} />
          <Route path="/confirmation/:lookupCode" element={<ConfirmationPage />} />
          <Route path="/lookup" element={<LookupPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/manager/:token" element={<ManagerDashboardPage />} />
          <Route path="/manager/:token/settings" element={<ManagerSettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
