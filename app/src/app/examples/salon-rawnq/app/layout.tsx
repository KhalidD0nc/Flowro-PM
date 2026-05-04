"use client";

import { AppShell } from "@/components/examples/salon-rawnq/app-kit";

export default function SalonAppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell brandName="صالون رونق">{children}</AppShell>;
}
