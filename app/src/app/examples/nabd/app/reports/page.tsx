"use client";

import { FadeIn, Panel, Button, StatusBadge } from "@/components/examples/nabd/app-kit";
import { Download, FileText, Table as TableIcon, BarChart } from "lucide-react";
import { mockExports } from "@/lib/examples/nabd/mock-data";

export default function Reports() {
  const requestExport = (format: string) => {
    alert(`بدء تجهيز تصدير بيانات بصيغة: ${format}`);
  };

  return (
    <div className="space-y-8">
      <FadeIn>
        <Panel className="p-6 sm:p-8 bg-cta text-white border-transparent">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
               <h2 className="text-2xl font-serif font-bold mb-2">أداء الأسبوع الحالي</h2>
               <p className="text-white/80 max-w-md">لقد أتممت ٧٨٪ من عاداتك المجدولة هذا الأسبوع. استمر في هذا الأداء الرائع للحفاظ على السلسلة!</p>
            </div>
            <div className="h-24 w-24 rounded-full border-4 border-white/20 flex items-center justify-center relative shrink-0">
               <svg className="absolute inset-0 h-full w-full -rotate-90">
                 <circle cx="50%" cy="50%" r="48" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/20"/>
                 <circle cx="50%" cy="50%" r="48" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="301" strokeDashoffset={301 * (1 - 0.78)} className="text-white transition-all duration-1000"/>
               </svg>
               <span className="text-2xl font-bold font-sans">٧٨٪</span>
            </div>
          </div>
        </Panel>
      </FadeIn>

      <div className="grid gap-8 lg:grid-cols-2">
        <FadeIn delay={0.1}>
          <Panel className="p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-accent text-cta rounded-lg"><BarChart className="h-5 w-5" /></div>
               <h3 className="text-lg font-bold text-ink">تصدير البيانات</h3>
            </div>
            <p className="text-sm text-ink-muted mb-6 leading-relaxed">
               يمكنك تصدير بيانات عاداتك وسجل التقدم والاحتفاظ بنسخة احتياطية أو طباعتها لمراجعة أهدافك.
            </p>
            <div className="flex flex-wrap gap-4">
               <Button onClick={() => requestExport("PDF")} variant="outline" className="flex-1">
                 <FileText className="h-4 w-4" /> تصدير PDF
               </Button>
               <Button onClick={() => requestExport("Excel")} variant="outline" className="flex-1">
                 <TableIcon className="h-4 w-4" /> تصدير Excel
               </Button>
            </div>
          </Panel>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Panel className="p-0 overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-line">
              <h3 className="text-lg font-bold text-ink">سجل التصدير الأخير</h3>
            </div>
            <div className="divide-y divide-line flex-1 overflow-auto">
              {mockExports.map((job) => (
                <div key={job.id} className="p-4 px-6 flex items-center justify-between hover:bg-surface-elevated transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm text-ink">{job.format} سجل البيانات</span>
                    <span className="text-xs text-ink-muted">{new Date(job.requestedAt).toLocaleString("ar-EG")}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={job.status === "completed" ? "success" : "warning"} />
                    {job.status === "completed" && (
                      <button className="text-cta hover:bg-accent p-2 rounded-full transition-colors" title="تحميل">
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </FadeIn>
      </div>
    </div>
  );
}
