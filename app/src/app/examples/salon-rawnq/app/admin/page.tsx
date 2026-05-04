"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Button, Input, Label, Panel, PageHeader, DataTable, StatusBadge, FadeIn, MetricCard,
} from "@/components/examples/salon-rawnq/app-kit";
import { mockBookings, mockServices } from "@/lib/examples/salon-rawnq/mock-data";
import { Lock, Users, CalendarCheck, Banknote } from "lucide-react";
import type { Booking } from "@/lib/examples/salon-rawnq/mock-data";

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      sessionStorage.setItem("salon_adminToken", "authenticated");
      onLogin();
    }
  };

  return (
    <div className="max-w-md mx-auto pt-20">
      <FadeIn>
        <Panel className="p-8 md:p-10 text-center border-line">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-ink mb-2">لوحة الإدارة</h1>
          <p className="text-sm text-ink-muted mb-8">تسجيل الدخول للمسؤولين فقط للمتابعة.</p>
          <form onSubmit={handleLogin} className="space-y-6 text-start">
            <div>
              <Label>كلمة المرور</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={!password}>
              دخول
            </Button>
          </form>
        </Panel>
      </FadeIn>
    </div>
  );
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);

  const toggleStatus = (id: string, current: string) => {
    const next = current === "pending" ? "confirmed" : current === "confirmed" ? "cancelled" : "pending";
    setBookings(bookings.map((b) => (b.id === id ? { ...b, status: next as any } : b)));
  };

  const columns = [
    {
      key: "custom_id", header: "رقم الحجز",
      render: (r: any) => <span className="font-mono text-sm text-ink-muted">#{r.id.split("_")[1].toUpperCase()}</span>,
    },
    { key: "customerName", header: "العميل", render: (r: any) => <span className="font-bold">{r.customerName}</span> },
    {
      key: "service", header: "الخدمة",
      render: (r: any) => {
        const s = mockServices.find((srv) => srv.id === r.serviceId);
        return <span className="text-sm">{s?.nameAr || "-"}</span>;
      },
    },
    {
      key: "timing", header: "الموعد",
      render: (r: any) => <span className="text-sm dir-ltr whitespace-nowrap">{r.date} | {r.time}</span>,
    },
    { key: "status", header: "الحالة", render: (r: any) => <StatusBadge status={r.status} /> },
    {
      key: "actions", header: "تغيير الحالة",
      render: (r: any) => (
        <Button size="sm" variant="outline" onClick={() => toggleStatus(r.id, r.status)}>تحديث</Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="إدارة الحجوزات"
        subtitle="متابعة وتنظيم المواعيد القادمة."
        action={
          <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={onLogout}>
            تسجيل الخروج
          </Button>
        }
      />
      <div className="grid gap-6 sm:grid-cols-3">
        <FadeIn delay={0}>
          <MetricCard label="إجمالي الحجوزات" value={bookings.length.toString()} icon={<CalendarCheck className="w-5 h-5" />} />
        </FadeIn>
        <FadeIn delay={0.1}>
          <MetricCard
            label="حجوزات بانتظار التأكيد"
            value={bookings.filter((b) => b.status === "pending").length.toString()}
            icon={<Users className="w-5 h-5" />}
          />
        </FadeIn>
        <FadeIn delay={0.2}>
          <MetricCard
            label="الإيرادات المتوقعة"
            value={
              bookings
                .filter((b) => b.status !== "cancelled")
                .reduce((acc, b) => acc + b.price, 0)
                .toLocaleString() + " ر.س"
            }
            icon={<Banknote className="w-5 h-5" />}
          />
        </FadeIn>
      </div>

      <FadeIn delay={0.3}>
        <Panel className="p-0 overflow-hidden border-line">
          <div className="bg-surface-elevated border-b border-line px-6 py-4">
            <h3 className="font-bold text-ink">سجل المواعيد</h3>
          </div>
          <DataTable data={bookings} columns={columns} />
        </Panel>
      </FadeIn>
    </div>
  );
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("salon_adminToken")) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => {
    sessionStorage.removeItem("salon_adminToken");
    setIsAuthenticated(false);
  };

  return isAuthenticated ? (
    <AdminDashboard onLogout={handleLogout} />
  ) : (
    <AdminLogin onLogin={handleLogin} />
  );
}
