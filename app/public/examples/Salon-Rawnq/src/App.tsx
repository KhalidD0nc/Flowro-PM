import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import LandingPage from "./pages/LandingPage";
import AppWorkspace from "./pages/AppWorkspace";
import NotFound from "./pages/NotFound";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: "easeInOut" } },
};

function AnimatedRoutes() {
  const location = useLocation();
  
  useEffect(() => {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'ar');
  }, []);

  // Ensure animations happen logically by route segment
  const animationKey = location.pathname.split("/")[1] || "home";

  return (
    <AnimatePresence mode="wait">
      <motion.div key={animationKey} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col w-full h-full min-h-screen">
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app/*" element={<AppWorkspace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
