"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { HeartPulse, Check, X, Menu } from "lucide-react";

// ── Animations ──
export const Reveal = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const FadeIn = ({ children, delay = 0, direction = "up", duration = 0.6, className = "" }: { children: React.ReactNode; delay?: number; direction?: "up" | "down" | "left" | "right" | "none"; duration?: number; className?: string }) => {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
    none: { x: 0, y: 0 },
  };
  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const staggerContainerVars = {
  hidden: { opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { staggerChildren: 0.05 } }
};

export const staggerItem: any = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export const StaggerContainer = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  return (
    <motion.div variants={staggerContainerVars} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className={className}>
      {children}
    </motion.div>
  );
};

// ── Structural Components ──
export const LandingShell = ({
  brandName,
  navLinks,
  ctaLabel,
  ctaTo,
  footer,
  children
}: {
  brandName: string;
  navLinks: { label: string; to: string }[];
  ctaLabel: string;
  ctaTo: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-ink font-sans transition-colors duration-300">
      <header className={`fixed top-0 start-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-surface-base/80 backdrop-blur-md border-b border-line shadow-sm py-4" : "bg-transparent py-6"}`}>
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-cta font-serif font-bold text-2xl">
            <HeartPulse className="h-6 w-6" />
            <span>{brandName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a key={l.label} href={l.to} className="text-sm font-medium text-ink-muted hover:text-ink transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link href={ctaTo} className="inline-flex items-center justify-center h-10 px-6 font-medium text-sm rounded-button bg-cta text-white hover:opacity-90 transition-opacity">
              {ctaLabel}
            </Link>
          </div>
        </div>
      </header>
      <main className="pt-24">{children}</main>
      <footer className="border-t border-line bg-surface-base">
        {footer}
      </footer>
    </div>
  );
};

export const AppShell = ({
  topbarContext,
  sidebarLinks,
  children
}: {
  topbarContext?: React.ReactNode;
  sidebarLinks: { label: string; to: string; icon: React.ReactNode }[];
  children: React.ReactNode;
}) => {
  const pathname = usePathname() || "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-ink flex flex-col md:flex-row rtl:flex-row">
      <aside className={`fixed top-0 start-0 z-40 h-screen w-[280px] bg-surface-base border-e border-line transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "max-md:translate-x-full md:translate-x-0"} md:relative`}>
        <div className="h-20 px-6 flex items-center gap-2 text-cta font-serif font-bold text-2xl border-b border-line">
          <HeartPulse className="h-6 w-6" />
          <span>نبض</span>
        </div>
        <nav className="p-4 space-y-2">
          {sidebarLinks.map((l) => {
            const active = pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                href={l.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium transition-colors ${active ? "bg-accent text-accent-text" : "text-ink-muted hover:bg-line-faint hover:text-ink"}`}
              >
                {l.icon}
                {l.label}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-4 start-4 end-4 p-4 rounded-card bg-surface-base border border-line shadow-sm text-xs text-ink-muted text-center">
          نبض © ٢٠٢٥ <br/> ابنِ عاداتك اليوم
        </div>
      </aside>

      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="sticky top-0 z-20 h-20 px-6 flex items-center justify-between bg-surface-base/80 backdrop-blur-md border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 text-ink-muted hover:text-ink rounded-button hover:bg-line-faint" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            {topbarContext}
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

// ── UI Primitives ──
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" | "danger", size?: "sm" | "md" | "lg" }>(
  ({ className = "", variant = "primary", size = "md", children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center gap-2 font-medium rounded-button transition-colors focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2";
    const variants = {
      primary: "bg-cta text-white hover:opacity-90 shadow-sm",
      outline: "border border-line bg-surface-base text-ink hover:bg-line-faint",
      ghost: "text-ink hover:bg-line-faint",
      danger: "bg-danger text-white hover:opacity-90 shadow-sm",
    };
    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };
    return (
      <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} disabled:opacity-50 disabled:pointer-events-none ${className}`} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`flex h-12 w-full rounded-input border border-line bg-surface-base px-4 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-cta focus:border-transparent transition-all ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`block text-sm font-medium text-ink-secondary mb-1.5 ${className}`}>
    {children}
  </label>
);

export const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-surface-base rounded-card border border-line shadow-card ${className}`}>
    {children}
  </div>
);

export const SectionHeader = ({ eyebrow, heading, subtitle, align = "start" }: { eyebrow: string; heading: string; subtitle?: string; align?: "start" | "center" }) => {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-start";
  return (
    <div className={`max-w-2xl ${alignClass}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-4 text-3xl md:text-4xl font-serif font-bold text-ink leading-tight">{heading}</h2>
      {subtitle && <p className="mt-4 text-lg text-ink-muted leading-relaxed">{subtitle}</p>}
    </div>
  );
};

export const MetricCard = ({ label, value, icon, change }: { label: string; value: string | number; icon?: React.ReactNode; change?: { value: string; positive: boolean } }) => (
  <Panel className="p-5 flex flex-col justify-between h-full">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-medium text-ink-muted">{label}</span>
      {icon && <div className="text-ink-secondary">{icon}</div>}
    </div>
    <div className="flex items-end justify-between items-baseline gap-2">
      <span className="text-3xl font-sans font-bold text-ink">{value}</span>
      {change && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${change.positive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
          {change.positive ? "+" : "-"}{change.value}
        </span>
      )}
    </div>
  </Panel>
);

export const StatusBadge = ({ status }: { status: "success" | "warning" | "danger" | "neutral" }) => {
  const styles = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    neutral: "bg-line-faint text-ink-secondary border-line",
  };
  const labels = {
    success: "مكتمل",
    warning: "قيد المعالجة",
    danger: "متأخر",
    neutral: "مسودة"
  };
  return (
    <span className={`inline-flex flex-shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export function Modal({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-surface-base rounded-card shadow-elevated border border-line flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <div>
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            {description && <p className="text-sm text-ink-muted mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="p-2 text-ink-muted hover:text-ink hover:bg-line-faint rounded-button transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto shrink">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line bg-secondary/30 shrink-0 flex items-center gap-3 justify-end">{footer}</div>}
      </motion.div>
    </div>
  );
}

// ── Shared Page Header ──
export const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div>
    <h1 className="text-xl font-serif font-bold text-ink">{title}</h1>
    {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
  </div>
);
