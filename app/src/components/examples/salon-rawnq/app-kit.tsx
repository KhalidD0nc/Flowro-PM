"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import React, { InputHTMLAttributes, ButtonHTMLAttributes } from "react";
import { ChevronRight } from "lucide-react";

// ── Button ──
export function Button({
  className = "",
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "h-9 px-4 text-xs", md: "h-11 px-6 text-sm", lg: "h-14 px-8 text-base" };
  const variants = {
    primary:   "bg-primary text-white hover:bg-primary/90",
    secondary: "bg-surface-elevated text-ink hover:bg-surface border border-line",
    outline:   "border-2 border-primary text-primary hover:bg-primary/5",
    ghost:     "text-ink-secondary hover:text-ink hover:bg-black/5",
    danger:    "bg-danger text-white hover:bg-danger/90",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ── Input ──
export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-12 w-full rounded-xl border border-line bg-surface px-4 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-ink-muted ${className}`}
      {...props}
    />
  );
}

// ── Label ──
export function Label({ className = "", children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`block text-[0.8125rem] font-medium text-ink-secondary mb-2 ${className}`} {...props}>
      {children}
    </label>
  );
}

// ── Panel ──
export function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-3xl bg-surface shadow-card border border-line/50 p-6 ${className}`}>
      {children}
    </div>
  );
}

// ── MetricCard ──
export function MetricCard({
  label, value, icon, change,
}: { label: string; value: string; icon: React.ReactNode; change?: { value: string; positive: boolean } }) {
  return (
    <Panel className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-ink-secondary">{label}</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      </div>
      <div className="text-3xl font-serif font-bold text-ink mb-1">{value}</div>
      {change && (
        <div className={`text-xs font-medium ${change.positive ? "text-success" : "text-danger"}`}>
          {change.positive ? "▲" : "▼"} {change.value} منذ الشهر الماضي
        </div>
      )}
    </Panel>
  );
}

// ── StatusBadge ──
export function StatusBadge({ status }: { status: string }) {
  const maps: Record<string, { label: string; color: string }> = {
    confirmed: { label: "مؤكد", color: "bg-success/10 text-success" },
    pending:   { label: "بانتظار التأكيد", color: "bg-warning/10 text-warning" },
    cancelled: { label: "ملغي", color: "bg-danger/10 text-danger" },
  };
  const config = maps[status] || maps["pending"];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${config.color}`}>
      {config.label}
    </span>
  );
}

// ── DataTable ──
export function DataTable<T extends object>({
  data,
  columns,
}: {
  data: T[];
  columns: { key: string; header: string; render?: (row: T) => React.ReactNode }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start">
        <thead className="border-b border-line bg-surface-elevated">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="py-4 px-5 text-xs font-bold text-ink-muted text-start whitespace-nowrap uppercase tracking-wider">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface">
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="py-8 text-center text-sm text-ink-muted">لا توجد بيانات</td></tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="hover:bg-surface-elevated/50 transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className="py-4 px-5 text-sm text-ink whitespace-nowrap">
                    {c.render ? c.render(row) : String((row as any)[c.key] || "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── PageHeader ──
export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink-muted leading-relaxed max-w-xl">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── SectionHeader ──
export function SectionHeader({
  eyebrow, heading, subtitle, align = "start",
}: { eyebrow: string; heading: string; subtitle?: string; align?: "start" | "center" }) {
  return (
    <div className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : "text-start"}`}>
      <p className="text-sm font-bold text-primary tracking-widest uppercase mb-3">{eyebrow}</p>
      <h2 className="text-3xl md:text-4xl font-serif font-bold text-ink mb-4 leading-tight">{heading}</h2>
      {subtitle && <p className="text-lg text-ink-muted leading-relaxed">{subtitle}</p>}
    </div>
  );
}

// ── AppShell (uses Next.js Link + usePathname) ──
export function AppShell({
  children,
  brandName = "صالون رونق",
}: {
  children: React.ReactNode;
  brandName?: string;
}) {
  const pathname = usePathname();
  const navItems = [
    { label: "الخدمات",  path: "/examples/salon-rawnq/app/services" },
    { label: "حجزي",     path: "/examples/salon-rawnq/app/booking" },
    { label: "الإدارة",  path: "/examples/salon-rawnq/app/admin" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-line shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/examples/salon-rawnq" className="font-serif text-3xl font-bold text-primary tracking-tight">
              {brandName}
            </Link>
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`px-4 py-2 rounded-lg text-[0.9375rem] font-medium transition-all ${
                      isActive ? "bg-primary/10 text-primary" : "text-ink-secondary hover:text-ink hover:bg-black/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {children}
      </main>
    </div>
  );
}

// ── LandingShell (uses Next.js Link) ──
export function LandingShell({
  brandName,
  ctaLabel,
  ctaHref,
  children,
}: {
  brandName: string;
  ctaLabel: string;
  ctaHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 flex flex-col">
      <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-lg border-b border-line">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/examples/salon-rawnq" className="font-serif text-3xl font-bold text-primary tracking-tight">
            {brandName}
          </Link>
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {ctaLabel}
          </Link>
        </div>
      </header>
      <main className="flex-1 pt-20">{children}</main>
      <footer className="border-t border-line bg-surface mt-24">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/examples/salon-rawnq" className="font-serif text-2xl font-bold text-ink opacity-50 hover:opacity-100 transition-opacity">
            {brandName}
          </Link>
          <p className="text-ink-muted text-sm font-medium">© 2026 {brandName}. كافة الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}

// ── Animation helpers ──
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export const staggerItem: any = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] } },
};

export function StaggerContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className={className}>
      {children}
    </motion.div>
  );
}

export function FadeIn({
  children, delay = 0, direction = "up", duration = 0.6, className = "",
}: { children: React.ReactNode; delay?: number; direction?: "up" | "down" | "left" | "right"; duration?: number; className?: string }) {
  const dirs = { up: { y: 30, x: 0 }, down: { y: -30, x: 0 }, left: { x: 30, y: 0 }, right: { x: -30, y: 0 } };
  return (
    <motion.div
      initial={{ opacity: 0, ...dirs[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
