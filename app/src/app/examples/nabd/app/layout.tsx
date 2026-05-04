"use client";

import { AppShell, PageHeader } from "@/components/examples/nabd/app-kit";
import { LayoutDashboard, PlusCircle, BarChart3 } from "lucide-react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const sidebarLinks = [
  { label: "لوحة القيادة", to: "/examples/nabd/app/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "إضافة عادة", to: "/examples/nabd/app/habits/new", icon: <PlusCircle className="h-5 w-5" /> },
  { label: "التقارير", to: "/examples/nabd/app/reports", icon: <BarChart3 className="h-5 w-5" /> },
];

export default function AppWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  
  // Mapping paths to titles for Topbar Context
  const getHeaderFromPath = () => {
    if (pathname.includes("/dashboard")) return { title: "لوحة القيادة", subtitle: "نظرة عامة على يومك وعاداتك" };
    if (pathname.includes("/habits/new")) return { title: "إضافة عادة جديدة", subtitle: "تأسيس روتين جديد لتحقيق أهدافك" };
    if (pathname.includes("/reports")) return { title: "التقارير", subtitle: "إحصائيات تقدمك وتصدير البيانات" };
    return { title: "مساحة العمل", subtitle: "" };
  };

  const header = getHeaderFromPath();

  return (
    <AppShell
      sidebarLinks={sidebarLinks}
      topbarContext={<PageHeader title={header.title} subtitle={header.subtitle} />}
    >
      <div className="max-w-5xl mx-auto pb-20 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
