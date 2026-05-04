import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import ConsultationBooking from "./pages/ConsultationBooking";
import AppWorkspace from "./pages/AppWorkspace";
import NotFound from "./pages/NotFound";

const pageVariants = {
  initial: { opacity: 0, filter: "blur(10px)" },
  animate: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, filter: "blur(10px)", transition: { duration: 0.3, ease: "easeIn" } },
};

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={location.pathname} 
        variants={pageVariants} 
        initial="initial" 
        animate="animate" 
        exit="exit" 
        className="w-full flex-grow bg-[hsl(var(--background))]"
      >
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/book-consultation" element={<ConsultationBooking />} />
          <Route path="/app" element={<AppWorkspace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
