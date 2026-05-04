"use client";

import { FadeIn, MetricCard, Panel, StaggerContainer, staggerItem } from "@/components/examples/nabd/app-kit";
import { Check, Info, Bell, Target, TrendingUp, Flame } from "lucide-react";
import { mockHabits, mockNotifications, mockStats } from "@/lib/examples/nabd/mock-data";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [habits, setHabits] = useState(mockHabits);
  const [notifications, setNotifications] = useState(mockNotifications);

  const toggleCompletion = (id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const isNowCompleted = !h.completedToday;
        return {
          ...h,
          completedToday: isNowCompleted,
          streakCount: isNowCompleted ? h.streakCount + 1 : Math.max(0, h.streakCount - 1)
        };
      }
      return h;
    }));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FadeIn delay={0}><MetricCard label="العادات النشطة" value={mockStats.activeHabits} icon={<Target className="h-5 w-5" />} /></FadeIn>
        <FadeIn delay={0.05}><MetricCard label="مكتملة اليوم" value={habits.filter(h=>h.completedToday).length} icon={<Check className="h-5 w-5" />} change={{ value: "تقدم جيد", positive: true }} /></FadeIn>
        <FadeIn delay={0.1}><MetricCard label="متوسط الإكمال" value={mockStats.averageCompletionRate} icon={<TrendingUp className="h-5 w-5" />} /></FadeIn>
        <FadeIn delay={0.15}><MetricCard label="أطول سلسلة حالية" value={Math.max(...habits.map(h=>h.streakCount))} icon={<Flame className="h-5 w-5" />} /></FadeIn>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 items-start">
        {/* Main Column: Habits list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-ink">عاداتك اليومية</h2>
            <span className="text-sm font-medium text-ink-muted">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>

          <StaggerContainer className="grid gap-4">
            {habits.map((habit) => (
              <motion.div key={habit.id} variants={staggerItem}>
                <Panel className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${habit.completedToday ? "bg-surface-elevated/50 border-success/20" : "bg-surface-base"}`}>
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleCompletion(habit.id)}
                      className={`shrink-0 mt-1 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${habit.completedToday ? "border-success bg-success text-white" : "border-line text-transparent hover:border-cta"}`}
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <div>
                      <h3 className={`font-bold transition-colors ${habit.completedToday ? "text-ink-secondary line-through" : "text-ink"}`}>{habit.title}</h3>
                      <p className="text-sm text-ink-muted mt-1">{habit.description}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-secondary bg-line-faint px-2 py-0.5 rounded-button">
                          {habit.frequency}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-cta bg-accent px-2 py-0.5 rounded-button">
                          <Flame className="h-3 w-3" /> {habit.streakCount} أيام متتالية
                        </span>
                      </div>
                    </div>
                  </div>
                </Panel>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>

        {/* Aside: Notifications */}
        <aside className="space-y-6">
          <div className="flex items-center gap-2 text-ink font-bold font-serif text-lg">
            <Bell className="h-5 w-5" /> الإشعارات والتذكيرات
          </div>
          {notifications.length === 0 ? (
            <Panel className="p-6 text-center text-ink-muted">
               <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
               <p className="text-sm">لا توجد إشعارات حالية.</p>
            </Panel>
          ) : (
            <StaggerContainer className="space-y-4">
              {notifications.map((notif) => (
                <motion.div key={notif.id} variants={staggerItem}>
                  <Panel className={`p-4 relative overflow-hidden border-s-4 ${notif.type === "success" ? "border-s-success bg-success/5" : "border-s-warning bg-warning/5"}`}>
                    <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                       {notif.title}
                    </h4>
                    <p className="mt-1 text-sm text-ink-secondary">{notif.message}</p>
                    <button onClick={() => dismissNotification(notif.id)} className="absolute top-2 end-2 p-1 text-ink-muted hover:text-ink">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </Panel>
                </motion.div>
              ))}
            </StaggerContainer>
          )}
        </aside>
      </div>
    </div>
  );
}
