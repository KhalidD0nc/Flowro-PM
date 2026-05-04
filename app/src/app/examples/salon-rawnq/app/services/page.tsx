"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PageHeader, Panel, Button, FadeIn, StaggerContainer, staggerItem,
} from "@/components/examples/salon-rawnq/app-kit";
import { mockServices } from "@/lib/examples/salon-rawnq/mock-data";
import { Clock, Banknote } from "lucide-react";
import { motion } from "framer-motion";

export default function ServicesPage() {
  const router = useRouter();
  return (
    <div className="space-y-12">
      <PageHeader
        title="الخدمات والباقات"
        subtitle="اكتشف مجموعة خدماتنا المصممة خصيصاً لراحتك وجمالك. اختر الخدمة المناسبة واحجز موعدك بسهولة."
      />
      <StaggerContainer className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {mockServices.map((service) => (
          <motion.div key={service.id} variants={staggerItem}>
            <Panel className="overflow-hidden p-0 flex flex-col h-full group hover:shadow-card-hover hover:border-line transition-all">
              <div className="aspect-[4/3] bg-surface relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={service.image}
                  alt={service.nameAr}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                {service.isOnOffer && (
                  <span className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                    {service.offerLabel}
                  </span>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-serif font-bold text-ink mb-3">{service.nameAr}</h3>
                <p className="text-sm text-ink-muted leading-relaxed line-clamp-2 mb-6 flex-1">{service.descriptionAr}</p>
                <div className="flex items-center justify-between mt-auto pt-6 border-t border-line">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink-secondary flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary/70" /> {service.durationMinutes} دقيقة
                    </span>
                    <span className="text-base font-bold text-ink flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-primary/70" /> {service.price} ريال
                    </span>
                  </div>
                  <Button variant="outline" onClick={() => router.push(`/examples/salon-rawnq/app/services/${service.id}`)}>
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
