import { useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Button, Input, Label, Panel, PageHeader, FadeIn, StatusBadge } from "../components/ui/app-kit";
import { mockServices, mockAvailabilitySlots, mockStaffMembers, Booking as BookingType } from "../lib/mock-data";
import { ArrowLeft, ArrowRight, Calendar, Clock, User, CheckCircle } from "lucide-react";

function BookingWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const serviceId = searchParams.get("serviceId") || mockServices[0].id;
  
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const service = mockServices.find(s => s.id === serviceId);

  const dates = Array.from(new Set(mockAvailabilitySlots.map(s => s.date))).sort();
  const availableSlots = selectedDate ? mockAvailabilitySlots.filter(s => s.date === selectedDate && s.isAvailable) : [];

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);
  
  const handleConfirm = () => {
    if (!service) return;
    const booking: BookingType = {
      id: "bk_" + Math.random().toString(36).substr(2, 9),
      serviceId: service.id,
      staffMemberId: selectedStaff || undefined,
      customerName,
      customerPhone,
      date: selectedDate,
      time: selectedTime,
      status: "confirmed",
      price: service.price,
      durationMinutes: service.durationMinutes,
      createdAt: new Date().toISOString()
    };
    navigate("/app/booking/confirmation", { state: { booking } });
  };

  if (!service) {
    return <div className="text-center py-20 text-ink-muted">برجاء اختيار خدمة أولاً.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
       <PageHeader title="حجز موعد إلكتروني" subtitle={`تكملة إجراءات الحجز لخدمة: ${service.nameAr}`} />
       
       <FadeIn>
         <Panel className="p-0 overflow-hidden border-line">
           {/* Step Indicator */}
           <div className="flex items-center gap-6 bg-surface-elevated border-b border-line px-8 py-5">
              <div className={`flex items-center gap-3 ${step >= 1 ? "text-primary" : "text-ink-muted"}`}>
                 <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? "bg-primary text-white" : "border-2 border-current bg-surface"}`}>1</span>
                 <span className="font-medium">الموعد</span>
              </div>
              <div className="flex-1 h-px bg-line"></div>
              <div className={`flex items-center gap-3 ${step >= 2 ? "text-primary" : "text-ink-muted"}`}>
                 <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? "bg-primary text-white" : "border-2 border-current bg-surface"}`}>2</span>
                 <span className="font-medium">البيانات</span>
              </div>
           </div>

           <div className="p-8 md:p-10">
             {step === 1 && (
               <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                 <div>
                    <h3 className="text-lg font-serif font-bold text-ink flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-primary"/> اختر التاريخ</h3>
                    <div className="flex flex-wrap gap-3">
                      {dates.map(date => (
                        <button
                           key={date}
                           onClick={() => { setSelectedDate(date); setSelectedTime(""); }}
                           className={`px-5 py-3 rounded-xl text-sm font-bold border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${selectedDate === date ? "border-primary bg-primary/5 text-primary" : "border-line bg-surface hover:border-primary/50 text-ink"}`}
                        >
                           {new Date(date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </button>
                      ))}
                    </div>
                 </div>

                 {selectedDate && (
                    <div>
                       <h3 className="text-lg font-serif font-bold text-ink flex items-center gap-2 mb-4"><Clock className="w-5 h-5 text-primary"/> اختر الوقت المتاح</h3>
                       <div className="flex flex-wrap gap-3">
                         {availableSlots.length > 0 ? availableSlots.map(slot => (
                           <button
                              key={slot.id}
                              onClick={() => setSelectedTime(slot.time)}
                              className={`px-6 py-3 rounded-xl text-sm font-bold border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${selectedTime === slot.time ? "border-primary bg-primary/5 text-primary" : "border-line bg-surface hover:border-primary/50 text-ink"}`}
                           >
                              {slot.time}
                           </button>
                         )) : (
                           <p className="text-sm text-ink-muted">لا توجد أوقات متاحة في هذا اليوم.</p>
                         )}
                       </div>
                    </div>
                 )}

                 <div className="pt-8 flex justify-end">
                   <Button size="lg" onClick={handleNext} disabled={!selectedDate || !selectedTime} className="w-full sm:w-auto">
                     الخطوة التالية <ArrowLeft className="w-5 h-5 ms-2" />
                   </Button>
                 </div>
               </div>
             )}

             {step === 2 && (
               <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                 <div>
                    <h3 className="text-lg font-serif font-bold text-ink flex items-center gap-2 mb-6"><User className="w-5 h-5 text-primary"/> بيانات الاتصال</h3>
                    <div className="grid gap-6 sm:grid-cols-2">
                       <div>
                         <Label>الاسم الكامل</Label>
                         <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="مثال: نورة محمد" autoFocus />
                       </div>
                       <div>
                         <Label>رقم الجوال</Label>
                         <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="text-end" />
                       </div>
                       <div className="sm:col-span-2">
                         <Label>اختيار مقدمة الخدمة (اختياري)</Label>
                         <select 
                           value={selectedStaff} 
                           onChange={e => setSelectedStaff(e.target.value)}
                           className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
                         >
                           <option value="">أي أخصائية متاحة</option>
                           {mockStaffMembers.filter(s => s.isAvailable).map(s => (
                             <option key={s.id} value={s.id}>{s.nameAr} - {s.roleAr}</option>
                           ))}
                         </select>
                       </div>
                    </div>
                 </div>

                 <div className="bg-background rounded-2xl p-6 border border-line">
                    <p className="text-sm text-ink-muted mb-2">ملخص الحجز:</p>
                    <p className="text-lg font-bold text-ink mb-1">{service.nameAr}</p>
                    <p className="text-sm font-medium text-ink-secondary">{new Date(selectedDate).toLocaleDateString('ar-SA')} الساعة {selectedTime}</p>
                    <p className="text-sm font-medium text-ink-secondary mt-1">الإجمالي: {service.price} ريال</p>
                 </div>

                 <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-between">
                   <Button size="lg" variant="secondary" onClick={handleBack} className="w-full sm:w-auto order-2 sm:order-1">
                     <ArrowRight className="w-5 h-5 me-2" /> رجوع
                   </Button>
                   <Button size="lg" onClick={handleConfirm} disabled={!customerName.trim() || !customerPhone.trim()} className="w-full sm:w-auto order-1 sm:order-2 shadow-glow">
                     تأكيد الحجز بنجاح
                   </Button>
                 </div>
               </div>
             )}
           </div>
         </Panel>
       </FadeIn>
    </div>
  );
}

function Confirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state?.booking as BookingType;

  if (!booking) {
    return <Navigate to="/app/services" replace />;
  }

  const service = mockServices.find(s => s.id === booking.serviceId);

  return (
    <div className="max-w-2xl mx-auto py-12 text-center space-y-8">
       <FadeIn>
         <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
           <CheckCircle className="w-12 h-12" />
         </div>
         <h1 className="text-4xl font-serif font-bold text-ink mb-4">تم تأكيد حجزك بنجاح!</h1>
         <p className="text-lg text-ink-muted font-medium mb-12">شكراً لكِ، ننتظرك بكل شوق في موعدك المحدد.</p>

         <Panel className="text-start border-line p-8 md:p-10 space-y-6">
           <div className="flex justify-between items-center border-b border-line pb-6">
             <div>
               <p className="text-sm text-ink-muted mb-1">رقم الحجز</p>
               <p className="font-mono font-bold text-primary text-xl">#{booking.id.split("_")[1].toUpperCase()}</p>
             </div>
             <StatusBadge status={booking.status} />
           </div>
           
           <div className="grid gap-6 sm:grid-cols-2 pt-2">
             <div>
               <p className="text-sm text-ink-muted mb-1">الخدمة</p>
               <p className="font-bold text-ink text-lg">{service?.nameAr}</p>
             </div>
             <div>
               <p className="text-sm text-ink-muted mb-1">الإجمالي</p>
               <p className="font-bold text-ink text-lg">{booking.price} ريال</p>
             </div>
             <div>
               <p className="text-sm text-ink-muted mb-1">التاريخ</p>
               <p className="font-bold text-ink text-lg">{new Date(booking.date).toLocaleDateString('ar-SA')}</p>
             </div>
             <div>
               <p className="text-sm text-ink-muted mb-1">الوقت</p>
               <p className="font-bold text-ink text-lg">{booking.time}</p>
             </div>
             <div className="sm:col-span-2">
               <p className="text-sm text-ink-muted mb-1">بيانات العميل</p>
               <p className="font-bold text-ink text-base">{booking.customerName} - <span dir="ltr">{booking.customerPhone}</span></p>
             </div>
           </div>
         </Panel>

         <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
           <Button size="lg" variant="secondary" onClick={() => navigate("/app/services")}>تصفح المزيد من الخدمات</Button>
         </div>
       </FadeIn>
    </div>
  );
}

export default function Booking() {
  return (
    <Routes>
       <Route index element={<BookingWizard />} />
       <Route path="confirmation" element={<Confirmation />} />
    </Routes>
  );
}
