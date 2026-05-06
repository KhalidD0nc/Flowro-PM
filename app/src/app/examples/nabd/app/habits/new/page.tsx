"use client";

import { FadeIn, Panel, Input, Label, Button } from "@/components/examples/nabd/app-kit";
import { Target, Calendar, Clock, Save, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddHabit() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    frequency: "daily",
    timeOfDay: "morning"
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Normally would integrate with backend or global state here.
    alert(`تمت إضافة العادة: ${formData.title}`);
    router.push("/examples/nabd/app/dashboard");
  };

  return (
    <FadeIn>
      <div className="max-w-2xl mx-auto mt-4 px-4 sm:px-0">
        <button onClick={() => router.push("/examples/nabd/app/dashboard")} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6 transition-colors">
          <ArrowRight className="h-4 w-4 rtl:rotate-180" /> العودة للوحة القيادة
        </button>
        
        <form onSubmit={handleSave}>
          <Panel className="p-6 sm:p-8 space-y-8">
            <div className="border-b border-line pb-6">
              <h2 className="text-xl font-serif font-bold text-ink">تفاصيل العادة</h2>
              <p className="text-sm text-ink-muted mt-1">ابدأ بتحديد اسم وهدف واضح للعادة الجديدة.</p>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="flex items-center gap-2"><Target className="h-4 w-4" /> اسم العادة</Label>
                <Input 
                  placeholder="مثال: القراءة لمدة ٢٠ دقيقة" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label>وصف قصير (اختياري)</Label>
                <Input 
                  placeholder="لماذا تريد بناء هذه العادة؟" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> التكرار</Label>
                  <select 
                    className="flex h-12 w-full rounded-input border border-line bg-surface-base px-4 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-cta focus:border-transparent transition-all"
                    value={formData.frequency}
                    onChange={e => setFormData({...formData, frequency: e.target.value})}
                  >
                    <option value="daily">يومياً</option>
                    <option value="weekdays">أيام العمل</option>
                    <option value="weekly">٣ أيام في الأسبوع</option>
                  </select>
                </div>
                <div>
                  <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> الوقت المفضل</Label>
                  <select 
                    className="flex h-12 w-full rounded-input border border-line bg-surface-base px-4 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-cta focus:border-transparent transition-all"
                    value={formData.timeOfDay}
                    onChange={e => setFormData({...formData, timeOfDay: e.target.value})}
                  >
                    <option value="morning">صباحاً</option>
                    <option value="afternoon">عصراً</option>
                    <option value="evening">مساءً</option>
                    <option value="anytime">أي وقت</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-line flex justify-end gap-4">
              <Button type="button" variant="ghost" onClick={() => router.push("/examples/nabd/app/dashboard")}>إلغاء</Button>
              <Button type="submit" className="px-8"><Save className="h-4 w-4" /> حفظ العادة</Button>
            </div>
          </Panel>
        </form>
      </div>
    </FadeIn>
  );
}
