"use client";

import React, { HTMLAttributes, ReactNode, forwardRef, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

// --- Layout Shells ---

export function LandingShell({ children, topbar, footer }: { children?: ReactNode; topbar?: ReactNode; footer?: ReactNode; }) {
  return (
    <div style={{ backgroundColor: 'var(--background)', color: 'var(--ink)' }} className="flex min-h-screen flex-col">
      {topbar}
      <main className="flex-grow">{children}</main>
      {footer}
    </div>
  );
}

export function AppShell({ children, topbar }: { children: ReactNode; topbar?: ReactNode }) {
  return (
    <div style={{ backgroundColor: 'var(--background)', color: 'var(--ink)' }} className="flex min-h-screen flex-col">
      <header style={{ borderBottomColor: 'var(--line)', backgroundColor: 'color-mix(in srgb, var(--surface) 80%, transparent)' }} className="sticky top-0 z-40 flex h-16 items-center border-b px-6 backdrop-blur">
        {topbar || <span style={{ color: 'var(--ink)' }} className="font-semibold">Workspace</span>}
      </header>
      <main style={{ backgroundColor: 'var(--background)' }} className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}

// --- Animation Components ---

export function FadeIn({ children, delay = 0, duration = 0.5, direction = "up", className }: { children: ReactNode, delay?: number, duration?: number, direction?: "up" | "down" | "left" | "right" | "none", className?: string }) {
  const y = direction === "up" ? 20 : direction === "down" ? -20 : 0;
  const x = direction === "left" ? 20 : direction === "right" ? -20 : 0;
  return (
    <motion.div initial={{ opacity: 0, y, x }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ duration, delay, ease: [0.2, 0.8, 0.2, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

export function Reveal({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={{ visible: { transition: { staggerChildren: 0.1 } }, hidden: {} }} className={className}>
      {children}
    </motion.div>
  );
}

const smoothEase = [0.2, 0.8, 0.2, 1] as const;

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: smoothEase } },
};

// --- Typography ---

export function SectionHeader({ eyebrow, heading, subtitle, align = "left" }: { eyebrow?: string; heading: string; subtitle?: string; align?: "left" | "center" }) {
  return (
    <div className={`flex flex-col gap-4 ${align === "center" ? "items-center text-center" : "items-start text-left"}`}>
      {eyebrow && <span style={{ color: 'var(--accent)' }} className="text-xs font-semibold uppercase tracking-widest">{eyebrow}</span>}
      <h2 style={{ color: 'var(--ink)' }} className="font-serif text-3xl font-normal leading-tight sm:text-4xl md:text-5xl">{heading}</h2>
      {subtitle && <p style={{ color: 'var(--ink-muted)' }} className="max-w-2xl text-base leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col">
      <h1 style={{ color: 'var(--ink)' }} className="text-xl font-semibold">{title}</h1>
      {subtitle && <p style={{ color: 'var(--ink-muted)' }} className="text-sm">{subtitle}</p>}
    </div>
  );
}

// --- Buttons & Inputs ---

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost', size?: 'default' | 'sm' | 'lg' }>(
  ({ className = '', variant = 'default', size = 'default', style, ...props }, ref) => {
    const baseStyle = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
    const sizeClass = { default: "h-11 px-5 py-2 text-sm", sm: "h-9 px-3 text-xs", lg: "h-14 px-8 py-3 text-base" }[size];
    const variantStyle: React.CSSProperties = variant === 'default'
      ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
      : variant === 'outline'
      ? { borderWidth: 1, borderColor: 'var(--line)', backgroundColor: 'transparent', color: 'var(--ink)' }
      : { color: 'var(--ink)' };
    return <button ref={ref} className={`${baseStyle} ${sizeClass} ${className}`} style={{ ...variantStyle, ...style }} {...props} />;
  }
);
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...props }, ref) => (
  <input ref={ref} style={{ borderColor: 'var(--line)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }} className={`flex h-12 w-full border px-4 py-2 text-sm placeholder:opacity-40 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
));
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className = '', ...props }, ref) => (
  <select ref={ref} style={{ borderColor: 'var(--line)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }} className={`flex h-12 w-full border px-4 py-2 text-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
));
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className = '', ...props }, ref) => (
  <textarea ref={ref} style={{ borderColor: 'var(--line)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }} className={`flex min-h-[140px] w-full border px-4 py-3 text-sm placeholder:opacity-40 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
));
Textarea.displayName = "Textarea";

export const Label = forwardRef<HTMLLabelElement, HTMLAttributes<HTMLLabelElement>>(({ className = '', ...props }, ref) => (
  <label ref={ref} style={{ color: 'var(--ink-secondary)' }} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props} />
));
Label.displayName = "Label";

// --- Data Display ---

export function Panel({ children, className = '', style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{ borderColor: 'var(--line-faint)', backgroundColor: 'var(--surface-elevated)', ...style }}
      className={`border shadow-md ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function MetricCard({ label, value, icon, change }: { label: string; value: string; icon?: ReactNode; change?: { value: string; positive: boolean } }) {
  return (
    <Panel className="flex flex-col p-5">
      <div className="flex items-center justify-between pb-2">
        <span style={{ color: 'var(--ink-muted)' }} className="text-sm font-medium">{label}</span>
        {icon && <span style={{ color: 'var(--ink-muted)' }}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span style={{ color: 'var(--ink)' }} className="text-2xl font-semibold">{value}</span>
        {change && (
          <span style={{ color: change.positive ? 'var(--success)' : 'var(--danger)' }} className="text-xs font-medium">
            {change.positive ? "+" : "-"}{change.value}
          </span>
        )}
      </div>
    </Panel>
  );
}

export function StatusBadge({ status }: { status: "active" | "completed" | "pending" | "error" }) {
  const colorMap: Record<string, string> = {
    active: 'var(--success)', completed: 'var(--accent)', pending: 'var(--warning)', error: 'var(--danger)'
  };
  return (
    <span style={{ backgroundColor: `color-mix(in srgb, ${colorMap[status]} 20%, transparent)`, color: colorMap[status] }} className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
      {status}
    </span>
  );
}

export function DataTable<T extends object>({ data, columns, className = '' }: { data: T[]; columns: { key: string; header: string; render?: (item: T) => ReactNode }[]; className?: string }) {
  return (
    <div className={`w-full overflow-auto ${className}`}>
      <table style={{ color: 'var(--ink)' }} className="w-full text-left text-sm">
        <thead style={{ borderBottomColor: 'var(--line)', backgroundColor: 'var(--surface)' }} className="border-b">
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ color: 'var(--ink-muted)' }} className="h-12 px-4 font-medium">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ color: 'var(--ink-muted)' }} className="p-4 text-center">No data available.</td></tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} style={{ borderBottomColor: 'var(--line-faint)' }} className="border-b transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className="p-4">{c.render ? c.render(row) : (row as any)[c.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- Modal ---

export function Modal({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} style={{ borderColor: 'var(--line)', backgroundColor: 'var(--surface)' }} className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border p-6 shadow-2xl">
            <div className="flex flex-col space-y-2">
              <h2 style={{ color: 'var(--ink)' }} className="text-xl font-semibold">{title}</h2>
              {description && <p style={{ color: 'var(--ink-muted)' }} className="text-sm">{description}</p>}
            </div>
            <div className="py-6">{children}</div>
            {footer && <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
