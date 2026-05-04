import { Metadata } from "next";
import "./nabd.css";

export const metadata: Metadata = {
  title: "نبض - Nabd",
  description: "ابنِ عاداتك اليوم",
};

export default function NabdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" lang="ar" className="nabd-root antialiased">
      {children}
    </div>
  );
}
