import { AppShell } from "../components/ui/app-kit";
import { Routes, Route, Navigate } from "react-router-dom";
import Services from "./Services";
import Booking from "./Booking";
import Admin from "./Admin";

export default function AppWorkspace() {
  return (
    <AppShell brandName="صالون رونق">
       <Routes>
          <Route path="services/*" element={<Services />} />
          <Route path="booking/*" element={<Booking />} />
          <Route path="admin/*" element={<Admin />} />
          <Route path="" element={<Navigate to="services" replace />} />
       </Routes>
    </AppShell>
  );
}
