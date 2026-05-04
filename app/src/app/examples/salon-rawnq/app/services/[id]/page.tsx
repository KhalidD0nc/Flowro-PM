"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FadeIn, Button } from "@/components/examples/salon-rawnq/app-kit";
import { mockServices } from "@/lib/examples/salon-rawnq/mock-data";
import { ArrowRight, ArrowLeft } from "lucide-react";

export default function ServiceDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const service = mockServices.find((s) => s.id === id);

  if (!service) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-ink-muted">الخدمة غير موجودة</p>
        <Button className="mt-4" onClick={() => router.push("/examples/salon-rawnq/app/services")}>
          عودة للخدمات
        </Button>
      </div>
    );
  }

  return (
    <FadeIn className="max-w-4xl mx-auto space-y-8">
      <Link
        href="/examples/salon-rawnq/app/services"
        className="inline-flex items-center text-sm font-medium text-ink-muted hover:text-primary transition-colors mb-4"
      >
        <ArrowRight className="w-4 h-4 me-2" /> العودة للقائمة
      </Link>

      <div className="rounded-3xl bg-surface shadow-card-hover border border-line overflow-hidden p-0">
        <div className="aspect-[21/9] bg-surface relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={service.image} alt={service.nameAr} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-8 text-white">
            {service.isOnOffer && (
              <span className="inline-block bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm mb-4">
                {service.offerLabel}
              </span>
            )}
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
            <Button
              size="lg"
              className="w-full shadow-glow mt-4"
              onClick={() => router.push(`/examples/salon-rawnq/app/booking?serviceId=${service.id}`)}
            >
              احجز هذه الخدمة <ArrowLeft className="w-5 h-5 ms-2" />
            </Button>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
