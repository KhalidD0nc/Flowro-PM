import { Routes, Route, useNavigate, useParams, Link } from "react-router-dom";
import { PageHeader, Panel, Button, FadeIn, StaggerContainer, staggerItem } from "../components/ui/app-kit";
import { mockServices } from "../lib/mock-data";
import { Clock, Banknote, ArrowRight, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

function ServiceList() {
  const navigate = useNavigate();
  return (
    <div className="space-y-12">
       <PageHeader title="الخدمات والباقات" subtitle="اكتشف مجموعة خدماتنا المصممة خصيصاً لراحتك وجمالك. اختر الخدمة المناسبة واحجز موعدك بسهولة." />
       
       <StaggerContainer className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
         {mockServices.map((service) => (
            <motion.div key={service.id} variants={staggerItem}>
               <Panel className="overflow-hidden p-0 flex flex-col h-full group hover:shadow-card-hover hover:border-line transition-all">
                  <div className="aspect-[4/3] bg-surface relative overflow-hidden">
                    <img src={service.image} alt={service.nameAr} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                    {service.isOnOffer && (
                       <span className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">{service.offerLabel}</span>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                     <h3 className="text-xl font-serif font-bold text-ink mb-3">{service.nameAr}</h3>
                     <p className="text-sm text-ink-muted leading-relaxed line-clamp-2 mb-6 flex-1">{service.descriptionAr}</p>
                     
                     <div className="flex items-center justify-between mt-auto pt-6 border-t border-line">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-medium text-ink-secondary flex items-center gap-2"><Clock className="w-4 h-4 text-primary/70"/> {service.durationMinutes} دقيقة</span>
                          <span className="text-base font-bold text-ink flex items-center gap-2"><Banknote className="w-4 h-4 text-primary/70"/> {service.price} ريال</span>
                        </div>
                        <Button variant="outline" onClick={() => navigate(`/app/services/${service.id}`)}>
                          التفاصيل
                        </Button>
                     </div>
                  </div>
               </Panel>
            </motion.div>
         ))}
       </StaggerContainer>
    </div>
  );
}

function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const service = mockServices.find(s => s.id === id);

  if (!service) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-ink-muted">الخدمة غير موجودة</p>
        <Button className="mt-4" onClick={() => navigate("/app/services")}>عودة للخدمات</Button>
      </div>
    );
  }

  return (
    <FadeIn className="max-w-4xl mx-auto space-y-8">
      <Link to="/app/services" className="inline-flex items-center text-sm font-medium text-ink-muted hover:text-primary transition-colors mb-4">
        <ArrowRight className="w-4 h-4 me-2" /> العودة للقائمة
      </Link>
      
      <Panel className="overflow-hidden p-0 border-line shadow-card-hover">
        <div className="aspect-[21/9] bg-surface relative">
           <img src={service.image} alt={service.nameAr} className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
           <div className="absolute bottom-0 inset-x-0 p-8 text-white">
              {service.isOnOffer && <span className="inline-block bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm mb-4">{service.offerLabel}</span>}
              <h1 className="text-4xl font-serif font-bold">{service.nameAr}</h1>
           </div>
        </div>
        <div className="p-8 md:p-12 flex flex-col md:flex-row gap-12">
           <div className="flex-1 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-ink mb-2">وصف الخدمة</h3>
                <p className="text-base text-ink-muted leading-relaxed font-medium">{service.descriptionAr}</p>
              </div>
           </div>
           <div className="md:w-72 shrink-0 space-y-6 bg-background rounded-2xl p-6 border border-line">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-secondary">المدة المتوقعة</span>
                <span className="font-bold text-ink">{service.durationMinutes} دقيقة</span>
              </div>
              <div className="h-px bg-line" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-secondary">السعر المبدئي</span>
                <span className="font-bold text-ink text-xl">{service.price} ريال</span>
              </div>
              <Button size="lg" className="w-full shadow-glow mt-4" onClick={() => navigate(`/app/booking?serviceId=${service.id}`)}>
                احجز هذه الخدمة <ArrowLeft className="w-5 h-5 ms-2" />
              </Button>
           </div>
        </div>
      </Panel>
    </FadeIn>
  );
}

export default function Services() {
  return (
    <Routes>
       <Route index element={<ServiceList />} />
       <Route path=":id" element={<ServiceDetail />} />
    </Routes>
  );
}
