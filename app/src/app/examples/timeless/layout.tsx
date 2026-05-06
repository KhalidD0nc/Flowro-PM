import type { Metadata } from "next";
import "./timeless.css";

export const metadata: Metadata = {
  title: "Timeless Spaces Studio — Premium Architecture & Construction",
  description: "Designing and building monumental spaces for private clients and commercial developers globally. Uncompromising precision in every detail.",
};

export default function TimelessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="timeless-root antialiased">
      {children}
    </div>
  );
}
