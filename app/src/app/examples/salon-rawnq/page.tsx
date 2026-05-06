"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LandingShell, FadeIn, Reveal, SectionHeader, StaggerContainer, staggerItem, Button, Panel,
} from "@/components/examples/salon-rawnq/app-kit";
import { ArrowLeft, Star, HandHeart, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { mockServices } from "@/lib/examples/salon-rawnq/mock-data";

export default function SalonLandingPage() {
  const router = useRouter();
  const featuredServices = mockServices.filter((s) => s.isFeatured);

  return (
    <LandingShell brandName="صالون رونق" ctaLabel="احجز موعدك" ctaHref="/examples/salon-rawnq/app/services">

      {/* ── Hero ── */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-24 lg:pt-28 lg:pb-36">
        <div className="grid gap-16 lg:grid-cols-[55fr_45fr] lg:items-center">
          <FadeIn direction="up" duration={0.8}>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface-elevated/50 backdrop-blur-sm px-4 py-2.5 text-xs font-bold text-ink-secondary mb-8 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              تجربة حجز رقمية راقية
            </div>
            <h1 className="font-serif text-5xl font-bold leading-[1.2] tracking-tight text-ink lg:text-[4.5rem]">
              الفخامة والسكينة<br />
              <span className="text-primary mt-2 block">في موعد واحد.</span>
            </h1>
            <p className="mt-8 max-w-lg text-xl leading-relaxed text-ink-muted font-medium">
              نقدم لك تجربة حجز سلسة وأنيقة. تصفح خدماتنا المميزة واختر الوقت الذي يناسبك بضغطة زر، لنهتم نحن بأدق تفاصيل راحتك.
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-5">
              <Button size="lg" onClick={() => router.push("/examples/salon-rawnq/app/services")} className="px-10 shadow-glow">
                احجز الآن <ArrowLeft className="h-5 w-5 ms-3" />
              </Button>
              <Button variant="ghost" size="lg" onClick={() => router.push("/examples/salon-rawnq/app/services")}>
                استكشف الخدمات
              </Button>
            </div>
          </FadeIn>

          <FadeIn direction="right" delay={0.2} duration={0.8}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[12rem] rounded-b-3xl border border-line shadow-elevated bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=1000&auto=format&fit=crop"
                alt="أجواء الصالون الفاخرة"
                className="h-full w-full object-cover animate-slow-zoom"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(30_20%_15%/0.5)] via-transparent to-transparent" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Featured Services ── */}
      <section className="bg-surface border-y border-line py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <SectionHeader
              eyebrow="خدمات استثنائية"
              heading="الأكثر طلباً لدينا"
              subtitle="اختر من بين باقاتنا المختارة بعناية لتجربة تعكس جمالك وصحتك."
              align="center"
            />
          </Reveal>
          <StaggerContainer className="mt-20 grid gap-8 md:grid-cols-2">
            {featuredServices.map((service) => (
              <motion.div key={service.id} variants={staggerItem}>
                <Panel className="h-full flex flex-col md:flex-row gap-6 p-6 hover:shadow-card-hover transition-all border-transparent hover:border-line">
                  <div className="md:w-1/3 aspect-square overflow-hidden rounded-2xl bg-background relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={service.image} alt={service.nameAr} className="w-full h-full object-cover" />
                    {service.isOnOffer && (
                      <span className="absolute top-3 right-3 bg-white text-primary text-[0.65rem] font-bold px-2 py-1 rounded-md shadow-sm">
                        {service.offerLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-2xl font-serif font-bold text-ink mb-3">{service.nameAr}</h3>
                    <p className="text-sm text-ink-muted leading-relaxed line-clamp-3 mb-6">{service.descriptionAr}</p>
                    <Button
                      variant="outline"
                      className="mt-auto self-start"
                      onClick={() => router.push(`/examples/salon-rawnq/app/services/${service.id}`)}
                    >
                      عرض التفاصيل
                    </Button>
                  </div>
                </Panel>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <div className="grid gap-12 md:grid-cols-3 text-center">
          {[
            { icon: <Star className="w-8 h-8" />, title: "جودة لا تضاهى", desc: "نستخدم أفضل المنتجات العالمية لضمان نتائج مبهرة وطويلة الأمد." },
            { icon: <HandHeart className="w-8 h-8" />, title: "عناية فائقة", desc: "فريقنا المتخصص يكرس وقته وخبرته لراحتك وتلبية احتياجاتك بدقة." },
            { icon: <Sparkles className="w-8 h-8" />, title: "أجواء مريحة", desc: "تصميم مدروس يوفر لك الخصوصية والهدوء المطلوب لتجربة لا تُنسى." },
          ].map((val, i) => (
            <Reveal key={i} className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-sm">
                {val.icon}
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">{val.title}</h3>
              <p className="text-base text-ink-muted leading-relaxed">{val.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <Reveal>
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-[3rem] bg-primary px-8 py-20 text-center lg:px-16 shadow-elevated">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=1200&auto=format&fit=crop')] opacity-10 mix-blend-overlay object-cover w-full h-full" />
            <div className="relative z-10">
              <h2 className="font-serif text-4xl font-bold text-white lg:text-5xl leading-tight">جاهزة لتجربة استثنائية؟</h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-white/90 leading-relaxed font-medium">
                احجزي موعدك الآن واكتشفي مفهوماً جديداً للرعاية والجمال في أجواء تليق بك.
              </p>
              <Button
                className="mt-10 bg-white text-primary hover:bg-white/95 shadow-lg shadow-black/10 px-10"
                size="lg"
                onClick={() => router.push("/examples/salon-rawnq/app/services")}
              >
                احجز موعدك <ArrowLeft className="h-5 w-5 ms-3" />
              </Button>
            </div>
          </div>
        </section>
      </Reveal>
    </LandingShell>
  );
}
