import type { Metadata } from "next";
import "./salon-rawnq.css";

export const metadata: Metadata = {
  title: "صالون رونق — احجزي موعدك",
  description: "صالون رونق: تجربة حجز رقمية راقية. تصفح خدماتنا المميزة واحجز موعدك بسهولة.",
};

export default function SalonRawnqLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="ar" className="salon-root antialiased">
      {children}
    </div>
  );
}
