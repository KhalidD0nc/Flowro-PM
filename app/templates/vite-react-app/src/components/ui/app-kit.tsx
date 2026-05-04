import * as React from "react";
import { Link, type LinkProps } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Button as ShadcnButton,
  buttonVariants,
  type ButtonProps as ShadcnButtonProps,
} from "@/components/ui/button";
import {
  Card as ShadcnCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Badge as ShadcnBadge } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

/* ═══════════════════════════════════════════════════════════════
   RE-EXPORTS — Base shadcn primitives (enhanced where needed)
   ═══════════════════════════════════════════════════════════════ */
export { ShadcnCard as Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export { ShadcnInput as Input };
export { ShadcnBadge as Badge };
export { buttonVariants };

/* ── Button ── */
export interface ButtonProps extends ShadcnButtonProps {
  isLoading?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, isLoading, children, disabled, ...props }, ref) => (
    <ShadcnButton
      ref={ref}
      className={cn("relative min-h-[44px] active:scale-[0.985] transition-transform", className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
        </span>
      )}
      <span className={cn(isLoading && "opacity-0")}>{children}</span>
    </ShadcnButton>
  )
);
Button.displayName = "Button";

/* ═══════════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════════ */

/** AppShell — responsive layout with optional sidebar */
export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
  sidebarWidth?: string;
}
export const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(
  ({ className, sidebar, topbar, sidebarWidth = "256px", children, ...props }, ref) => (
    <div ref={ref} className={cn("flex min-h-screen", className)} {...props}>
      {sidebar && (
        <aside
          className="hidden lg:flex flex-col border-r border-[hsl(var(--line))] bg-[hsl(var(--surface-elevated))]"
          style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        >
          {sidebar}
        </aside>
      )}
      <div className="flex flex-1 flex-col min-w-0">
        {topbar && (
          <header className="flex items-center h-16 px-6 border-b border-[hsl(var(--line))] bg-[hsl(var(--surface-elevated))]">
            {topbar}
          </header>
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
);
AppShell.displayName = "AppShell";

/** PageHeader — sticky title bar with actions */
export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, subtitle, actions, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b border-[hsl(var(--line))] bg-[hsl(var(--surface-elevated))]",
        className
      )}
      {...props}
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[hsl(var(--ink))]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[hsl(var(--ink-muted))]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
);
PageHeader.displayName = "PageHeader";

/** Panel — elevated surface container */
export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: "none" | "card" | "elevated";
}
export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, padding = "md", shadow = "card", children, ...props }, ref) => {
    const padMap = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };
    const shadowMap = { none: "", card: "shadow-card", elevated: "shadow-elevated" };
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface-elevated))]",
          padMap[padding],
          shadowMap[shadow],
          "transition-shadow hover:shadow-card-hover",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Panel.displayName = "Panel";

/* ═══════════════════════════════════════════════════════════════
   DATA DISPLAY
   ═══════════════════════════════════════════════════════════════ */

/** MetricCard — dashboard stat with trend */
export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  change?: { value: string; positive: boolean };
  icon?: React.ReactNode;
}
export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, label, value, change, icon, ...props }, ref) => (
    <Panel ref={ref} className={cn("flex items-start justify-between", className)} {...props}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--ink-muted))]">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-[hsl(var(--ink))]">{value}</p>
        {change && (
          <p className={cn("mt-1 text-sm font-medium", change.positive ? "text-[hsl(var(--success))]" : "text-[hsl(var(--danger))]")}>
            {change.positive ? "↑" : "↓"} {change.value}
          </p>
        )}
      </div>
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent-text))]">
          {icon}
        </div>
      )}
    </Panel>
  )
);
MetricCard.displayName = "MetricCard";

/** DataTable — sortable table with semantic styling */
export interface DataTableProps<T extends object> extends React.HTMLAttributes<HTMLTableElement> {
  data: T[];
  columns: {
    key: keyof T | string;
    header: string;
    width?: string;
    align?: "left" | "center" | "right";
    render?: (row: T) => React.ReactNode;
  }[];
  emptyMessage?: string;
}
export function DataTable<T extends object>({
  data,
  columns,
  emptyMessage = "No data available",
  className,
  ...props
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <Panel className="py-12">
        <EmptyState message={emptyMessage} />
      </Panel>
    );
  }
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[hsl(var(--line))]">
      <table className={cn("w-full text-sm", className)} {...props}>
        <thead className="bg-[hsl(var(--line-faint))]">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ink-muted))]",
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right"
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[hsl(var(--line))]">
          {data.map((row, i) => (
            <tr key={i} className="bg-[hsl(var(--surface-elevated))] hover:bg-[hsl(var(--accent-soft))] transition-colors">
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={cn(
                    "px-4 py-3 text-[hsl(var(--ink-secondary))]",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right"
                  )}
                >
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key as string] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** StatusBadge — semantic status indicator */
const statusVariants = {
  active: "bg-[hsl(var(--success-soft))] text-[hsl(var(--success-text))] border-[hsl(var(--success))]/20",
  inactive: "bg-[hsl(var(--line-faint))] text-[hsl(var(--ink-muted))] border-[hsl(var(--line))]/50",
  pending: "bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning-text))] border-[hsl(var(--warning))]/20",
  error: "bg-[hsl(var(--danger-soft))] text-[hsl(var(--danger-text))] border-[hsl(var(--danger))]/20",
  default: "bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent-text))] border-[hsl(var(--accent))]/20",
};
export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: keyof typeof statusVariants;
  label?: string;
}
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, label, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusVariants[status] ?? statusVariants.default,
        className
      )}
      {...props}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "active" && "bg-[hsl(var(--success))]", status === "pending" && "bg-[hsl(var(--warning))]", status === "error" && "bg-[hsl(var(--danger))]", status === "inactive" && "bg-[hsl(var(--ink-muted))]", status === "default" && "bg-[hsl(var(--accent-text))]")} />
      {label ?? status}
    </span>
  )
);
StatusBadge.displayName = "StatusBadge";

/** Avatar — user image or initials fallback */
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  initials?: string;
  size?: "sm" | "md" | "lg";
}
export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, initials, size = "md", ...props }, ref) => {
    const sizeMap = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" };
    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full overflow-hidden bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent-text))] font-semibold",
          sizeMap[size],
          className
        )}
        {...props}
      >
        {src ? (
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <span>{initials?.slice(0, 2).toUpperCase() ?? "?"}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

/** ProgressBar — linear progress indicator */
export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: "sm" | "md";
  variant?: "default" | "success" | "warning" | "danger";
  showLabel?: boolean;
}
export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, max = 100, size = "md", variant = "default", showLabel, ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    const heightMap = { sm: "h-1.5", md: "h-2.5" };
    const colorMap = {
      default: "bg-[hsl(var(--cta))]",
      success: "bg-[hsl(var(--success))]",
      warning: "bg-[hsl(var(--warning))]",
      danger: "bg-[hsl(var(--danger))]",
    };
    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <div className={cn("w-full overflow-hidden rounded-full bg-[hsl(var(--line-faint))]", heightMap[size])}>
          <motion.div
            className={cn("h-full rounded-full", colorMap[variant])}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        {showLabel && (
          <p className="mt-1 text-xs text-[hsl(var(--ink-muted))]">{Math.round(pct)}% complete</p>
        )}
      </div>
    );
  }
);
ProgressBar.displayName = "ProgressBar";

/** Timeline — vertical event timeline */
export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    title: string;
    description?: string;
    time?: string;
    status?: "completed" | "active" | "pending";
  }[];
}
export const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, items, ...props }, ref) => (
    <div ref={ref} className={cn("relative", className)} {...props}>
      {items.map((item, i) => (
        <div key={i} className="flex gap-4 pb-6 last:pb-0">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "h-3 w-3 rounded-full border-2",
                item.status === "completed"
                  ? "border-[hsl(var(--success))] bg-[hsl(var(--success))]"
                  : item.status === "active"
                  ? "border-[hsl(var(--cta))] bg-[hsl(var(--surface-elevated))]"
                  : "border-[hsl(var(--line))] bg-[hsl(var(--surface-elevated))]"
              )}
            />
            {i < items.length - 1 && <div className="mt-1 h-full w-px bg-[hsl(var(--line))]" />}
          </div>
          <div className="flex-1 -mt-1">
            <p className="text-sm font-medium text-[hsl(var(--ink))]">{item.title}</p>
            {item.description && <p className="mt-0.5 text-sm text-[hsl(var(--ink-muted))]">{item.description}</p>}
            {item.time && <p className="mt-1 text-xs text-[hsl(var(--ink-muted))]">{item.time}</p>}
          </div>
        </div>
      ))}
    </div>
  )
);
Timeline.displayName = "Timeline";

/* ═══════════════════════════════════════════════════════════════
   FEEDBACK
   ═══════════════════════════════════════════════════════════════ */

/** EmptyState — friendly empty list state */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, message = "Nothing here yet", action, icon, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col items-center justify-center py-12 text-center", className)} {...props}>
      {icon && <div className="mb-4 text-[hsl(var(--ink-muted))]">{icon}</div>}
      <p className="text-sm font-medium text-[hsl(var(--ink-secondary))]">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
);
EmptyState.displayName = "EmptyState";

/** Skeleton — loading placeholder */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rect" | "circle";
  width?: string;
  height?: string;
}
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = "rect", width, height, ...props }, ref) => {
    const base = "animate-shimmer bg-gradient-to-r from-[hsl(var(--line-faint))] via-[hsl(var(--line))] to-[hsl(var(--line-faint))] bg-[length:200%_100%] rounded-md";
    const shape = variant === "circle" ? "rounded-full" : variant === "text" ? "h-4 rounded" : "rounded-lg";
    return (
      <div
        ref={ref}
        className={cn(base, shape, className)}
        style={{ width, height }}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

/** Toast — simple notification */
export interface ToastProps {
  message: string;
  variant?: "success" | "error" | "info";
  onDismiss?: () => void;
}
export function Toast({ message, variant = "info", onDismiss }: ToastProps) {
  const variantMap = {
    success: "bg-[hsl(var(--success-soft))] text-[hsl(var(--success-text))] border-[hsl(var(--success))]/20",
    error: "bg-[hsl(var(--danger-soft))] text-[hsl(var(--danger-text))] border-[hsl(var(--danger))]/20",
    info: "bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent-text))] border-[hsl(var(--accent))]/20",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 shadow-elevated",
        variantMap[variant]
      )}
    >
      <span className="text-sm font-medium">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-auto text-xs opacity-60 hover:opacity-100">
          Dismiss
        </button>
      )}
    </motion.div>
  );
}

/** Modal — accessible overlay dialog */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const sizeMap = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              "relative z-10 w-full rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface-elevated))] shadow-elevated",
              sizeMap[size]
            )}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {(title || description) && (
              <div className="px-6 pt-6 pb-2">
                {title && <h2 className="text-lg font-semibold text-[hsl(var(--ink))]">{title}</h2>}
                {description && <p className="mt-1 text-sm text-[hsl(var(--ink-muted))]">{description}</p>}
              </div>
            )}
            <div className="px-6 py-4">{children}</div>
            {footer && <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--line))] px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** ConfirmDialog — yes/no confirmation */
export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div />
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FORMS
   ═══════════════════════════════════════════════════════════════ */

/** Textarea */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-[hsl(var(--line))] bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-[hsl(var(--ink-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--cta))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

/** Select */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none rounded-lg border border-[hsl(var(--line))] bg-transparent px-3 py-2 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--cta))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--ink-muted))]">▼</span>
    </div>
  )
);
Select.displayName = "Select";

/** Label */
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-medium text-[hsl(var(--ink-secondary))] mb-1.5 block", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";

/* ═══════════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════════ */

/** Tabs — horizontal tab navigation */
export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
}
export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, tabs, activeTab, onChange, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-1 border-b border-[hsl(var(--line))]", className)} {...props}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === tab.id ? "text-[hsl(var(--ink))]" : "text-[hsl(var(--ink-muted))] hover:text-[hsl(var(--ink-secondary))]"
          )}
        >
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="active-tab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--cta))]"
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            />
          )}
        </button>
      ))}
    </div>
  )
);
Tabs.displayName = "Tabs";

/** Dropdown — simple dropdown menu */
export interface DropdownProps {
  trigger: React.ReactNode;
  items: { label: string; onClick: () => void; destructive?: boolean }[];
  align?: "left" | "right";
}
export function Dropdown({ trigger, items, align = "left" }: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(!open)} className="inline-flex">
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 mt-1.5 min-w-[10rem] rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface-overlay))] py-1 shadow-elevated",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { item.onClick(); setOpen(false); }}
                className={cn(
                  "block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-[hsl(var(--accent-soft))]",
                  item.destructive ? "text-[hsl(var(--danger-text))]" : "text-[hsl(var(--ink-secondary))]"
                )}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** AppLink — styled router Link */
export interface AppLinkProps extends LinkProps {
  variant?: "default" | "muted" | "cta";
}
export const AppLink = React.forwardRef<HTMLAnchorElement, AppLinkProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantMap = {
      default: "text-[hsl(var(--cta))] hover:underline underline-offset-4",
      muted: "text-[hsl(var(--ink-muted))] hover:text-[hsl(var(--ink-secondary))]",
      cta: "inline-flex items-center gap-1 text-[hsl(var(--cta))] font-medium hover:underline underline-offset-4",
    };
    return <Link ref={ref} className={cn(variantMap[variant], className)} {...props} />;
  }
);
AppLink.displayName = "AppLink";

/* ═══════════════════════════════════════════════════════════════
   MOTION WRAPPERS
   ═══════════════════════════════════════════════════════════════ */

/** FadeIn — wrapper for entrance animation */
export interface FadeInProps {
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
  children?: React.ReactNode;
}
export const FadeIn = React.forwardRef<HTMLDivElement, FadeInProps>(
  ({ className, delay = 0, direction = "up", duration = 0.4, children }, ref) => {
    const dirMap = {
      up: { y: 16 },
      down: { y: -16 },
      left: { x: 16 },
      right: { x: -16 },
      none: {},
    };
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, ...dirMap[direction] }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration, delay, ease: "easeOut" }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }
);
FadeIn.displayName = "FadeIn";

/** StaggerContainer — staggers children animations */
export interface StaggerContainerProps {
  className?: string;
  staggerDelay?: number;
  children?: React.ReactNode;
}
export const StaggerContainer = React.forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ className, staggerDelay = 0.05, children }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
);
StaggerContainer.displayName = "StaggerContainer";

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};
