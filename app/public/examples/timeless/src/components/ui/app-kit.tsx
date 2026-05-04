import React, { HTMLAttributes, ReactNode, forwardRef, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- Layout Shells ---

export function LandingShell({
  children,
  topbar,
  footer,
}: {
  children?: ReactNode;
  topbar?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--ink))]">
      {topbar}
      <main className="flex-grow">{children}</main>
      {footer}
    </div>
  );
}

export function AppShell({ children, topbar }: { children: ReactNode; topbar?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--ink))]">
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-[hsl(var(--line))] bg-[hsl(var(--surface))/0.8] px-6 backdrop-blur">
        {topbar || <span className="font-semibold text-[hsl(var(--ink))]">Workspace</span>}
      </header>
      <main className="flex-1 overflow-auto bg-[hsl(var(--background))] p-6">
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
    <motion.div
      initial={{ opacity: 0, y, x }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={{
        visible: { transition: { staggerChildren: 0.1 } },
        hidden: {},
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] } },
};

// --- Typography Components ---

export function SectionHeader({ eyebrow, heading, subtitle, align = "left" }: { eyebrow?: string; heading: string; subtitle?: string; align?: "left" | "center" }) {
  return (
    <div className={`flex flex-col gap-4 ${align === "center" ? "items-center text-center" : "items-start text-left"}`}>
      {eyebrow && <span className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--accent))]">{eyebrow}</span>}
      <h2 className="font-serif text-3xl font-normal leading-tight text-[hsl(var(--ink))] sm:text-4xl md:text-5xl">{heading}</h2>
      {subtitle && <p className="max-w-2xl text-base leading-relaxed text-[hsl(var(--ink-muted))]">{subtitle}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col">
      <h1 className="text-xl font-semibold text-[hsl(var(--ink))]">{title}</h1>
      {subtitle && <p className="text-sm text-[hsl(var(--ink-muted))]">{subtitle}</p>}
    </div>
  );
}

// --- Primitive Inputs & Actions ---

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost', size?: 'default' | 'sm' | 'lg' }>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyle = "inline-flex items-center justify-center rounded-none font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] disabled:pointer-events-none disabled:opacity-50";
    const variants = {
      default: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-text))] hover:bg-[hsl(var(--accent))/0.9]",
      outline: "border border-[hsl(var(--line))] bg-transparent hover:bg-[hsl(var(--surface-elevated))] text-[hsl(var(--ink))]",
      ghost: "hover:bg-[hsl(var(--surface-elevated))] text-[hsl(var(--ink))]",
    };
    const sizes = {
      default: "h-11 px-5 py-2 text-sm",
      sm: "h-9 px-3 text-xs",
      lg: "h-14 px-8 py-3 text-base",
    };
    return <button ref={ref} className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
  }
);
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`flex h-12 w-full rounded-none border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-4 py-2 text-sm text-[hsl(var(--ink))] placeholder:text-[hsl(var(--line))] transition-colors focus:border-[hsl(var(--accent))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
));
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className = '', ...props }, ref) => (
  <select
    ref={ref}
    className={`flex h-12 w-full rounded-none border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-4 py-2 text-sm text-[hsl(var(--ink))] transition-colors focus:border-[hsl(var(--accent))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
));
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    className={`flex min-h-[140px] w-full rounded-none border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-4 py-3 text-sm text-[hsl(var(--ink))] placeholder:text-[hsl(var(--line))] transition-colors focus:border-[hsl(var(--accent))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = forwardRef<HTMLLabelElement, HTMLAttributes<HTMLLabelElement>>(({ className = '', ...props }, ref) => (
  <label ref={ref} className={`text-sm font-medium leading-none text-[hsl(var(--ink-secondary))] peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props} />
));
Label.displayName = "Label";

// --- Data Display Components ---

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-none border border-[hsl(var(--line-faint))] bg-[hsl(var(--surface-elevated))] shadow-md ${className}`}>
      {children}
    </div>
  );
}

export function MetricCard({ label, value, icon, change }: { label: string; value: string; icon?: ReactNode; change?: { value: string; positive: boolean } }) {
  return (
    <Panel className="flex flex-col p-5">
      <div className="flex items-center justify-between pb-2">
        <span className="text-sm font-medium text-[hsl(var(--ink-muted))]">{label}</span>
        {icon && <span className="text-[hsl(var(--ink-muted))]">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-[hsl(var(--ink))]">{value}</span>
        {change && (
          <span className={`text-xs font-medium ${change.positive ? "text-[hsl(var(--success))]" : "text-[hsl(var(--danger))]"}`}>
            {change.positive ? "+" : "-"}{change.value}
          </span>
        )}
      </div>
    </Panel>
  );
}

export function StatusBadge({ status }: { status: "active" | "completed" | "pending" | "error" }) {
  const styles = {
    active: "bg-[hsl(var(--success))/0.2] text-[hsl(var(--success))]",
    completed: "bg-[hsl(var(--accent))/0.2] text-[hsl(var(--accent))]",
    pending: "bg-[hsl(var(--warning))/0.2] text-[hsl(var(--warning))]",
    error: "bg-[hsl(var(--danger))/0.2] text-[hsl(var(--danger))]",
  };
  return (
    <span className={`inline-flex items-center rounded-none px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}

export function DataTable<T extends object>({ data, columns, className = '' }: { data: T[]; columns: { key: string; header: string; render?: (item: T) => ReactNode }[]; className?: string }) {
  return (
    <div className={`w-full overflow-auto ${className}`}>
      <table className="w-full text-left text-sm text-[hsl(var(--ink))]">
        <thead className="border-b border-[hsl(var(--line))] bg-[hsl(var(--surface))]">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="h-12 px-4 font-medium text-[hsl(var(--ink-muted))]">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-4 text-center text-[hsl(var(--ink-muted))]">No data available.</td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="border-b border-[hsl(var(--line-faint))] hover:bg-[hsl(var(--surface))/0.5] transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className="p-4">
                    {c.render ? c.render(row) : (row as any)[c.key]}
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

// --- Overlay Components ---

export function Modal({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-2xl"
          >
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <h2 className="text-xl font-semibold text-[hsl(var(--ink))]">{title}</h2>
              {description && <p className="text-sm text-[hsl(var(--ink-muted))]">{description}</p>}
            </div>
            <div className="py-6">{children}</div>
            {footer && <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
