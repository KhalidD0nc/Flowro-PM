"use client";

import { LandingShell, FadeIn, Reveal, SectionHeader, StaggerContainer, staggerItem, Button, Panel } from "@/components/examples/nabd/app-kit";
import { ArrowLeft, CheckCircle, BellRing, Target, Activity, Quote } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const features = [
  { icon: <Activity className="h-5 w-5" />, title: "تتبع يومي سلس", description: "واجهة واضحة لمتابعة عاداتك اليومية بنقرة واحدة." },
  { icon: <BellRing className="h-5 w-5" />, title: "إشعارات ذكية", description: "تذكيرات في الوقت المناسب دون إزعاج يذكر." },
  { icon: <Target className="h-5 w-5" />, title: "إحصائيات أسبوعية", description: "رسم بياني يوضح تقدمك ومدى التزامك طوال الأسبوع." },
];

const benefits = ["لا يتطلب إعداد مُعقّد", "يعمل على جميع الأجهزة", "متوافق مع نمط حياتك"];

export default function LandingPage() {
  const router = useRouter();

  return (
    <LandingShell
      brandName="نبض"
      navLinks={[{ label: "المميزات", to: "#features" }, { label: "آراء المستخدمين", to: "#testimonials" }]}
      ctaLabel="ابدأ مجاناً"
      ctaTo="/examples/nabd/app/dashboard"
      footer={
        <div className="mx-auto max-w-[1280px] px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">© ٢٠٢٥ نبض. جميع الحقوق محفوظة.</p>
          <div className="flex gap-6">
            {["الخصوصية", "الشروط", "تواصل معنا"].map((l) => (
              <a key={l} href="#" className="link-underline text-sm text-ink-muted hover:text-ink transition-colors">{l}</a>
            ))}
          </div>
        </div>
      }
    >
      {/* ── Hero: RTL asymmetric 55/45 split ── */}
      <section className="mx-auto max-w-[1280px] px-6 pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="grid gap-12 lg:grid-cols-[55fr_45fr] lg:items-center">
          {/* Right side in visual terms (first node in DOM logic with dir=rtl) */}
          <FadeIn direction="up" duration={0.6}>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-elevated px-3.5 py-1.5 text-xs font-medium text-ink-secondary shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              الآن في النسخة التجريبية المفتوحة
            </div>
            <h1 className="mt-8 font-serif text-5xl font-bold leading-[1.2] tracking-tight text-ink lg:text-6xl">
              ابنِ عاداتك،<br />
              <span className="text-cta">غيّر حياتك.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-muted">
              المنصة العربية الأولى المصممة بهدوء وبساطة لمساعدتك على الاستمرار في بناء الروتين اليومي الذي تطمح إليه، بعيداً عن المشتتات.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button size="lg" onClick={() => router.push("/examples/nabd/app/dashboard")} className="gap-3">
                ابدأ رحلتك مجاناً <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <Button variant="outline" size="lg">كيف يعمل المنصة؟</Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
                  <CheckCircle className="h-4 w-4 text-success" /> {b}
                </li>
              ))}
            </ul>
          </FadeIn>

          {/* Left side in visual terms */}
          <FadeIn direction="right" delay={0.2} duration={0.6}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-line shadow-elevated bg-secondary/50 flex items-center justify-center">
              {/* Decorative visual composition representing consistency */}
              <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-transparent" />
              <div className="relative w-3/4 flex flex-col gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`h-16 w-full rounded-xl bg-surface-elevated shadow-card border border-line flex items-center px-4 gap-4 ${i === 1 ? "opacity-80 translate-x-4" : ""} ${i === 2 ? "opacity-60 translate-x-8" : ""}`}>
                     <div className={`h-6 w-6 rounded-full border-2 ${i === 0 ? "border-success bg-success/20" : "border-line"}`} />
                     <div className="h-2 flex-1 bg-line rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-surface-elevated py-24 border-y border-line">
        <div className="mx-auto max-w-[1280px] px-6">
          <Reveal>
            <SectionHeader
              eyebrow="المميزات الأساسية"
              heading="كل ما تحتاجه للتركيز والاستمرار"
              subtitle="واجهة خالية من المشتتات صُممت لتعزيز الإنتاجية ومساعدتك على بناء زخم يومي لا ينقطع."
              align="center"
            />
          </Reveal>
          <StaggerContainer className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <motion.div key={f.title} variants={staggerItem}>
                <Panel className="h-full p-8 hover:shadow-card-hover transition-all duration-300 group">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-cta group-hover:scale-110 transition-transform">
                    {f.icon}
                  </div>
                  <h3 className="mt-6 text-xl font-serif font-bold text-ink">{f.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-ink-muted">{f.description}</p>
                </Panel>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <Reveal>
            <SectionHeader
              eyebrow="آراء المستخدمين"
              heading="قصص نجاح من مجتمعنا"
            />
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[
              { text: "تطبيق نبض غير طريقتي في الالتزام بالتأمل اليومي. الواجهة العربية المريحة والتصميم الهادئ يجعلاني أرغب في العودة كل يوم.", author: "أحمد س.", role: "مطور برمجيات" },
              { text: "أفضل تطبيق راقبته لتعقب شرب الماء والقراءة. تقارير الإحصائيات الأسبوعية ممتازة وتصدر بسهولة كملف PDF.", author: "سارة م.", role: "طالبة دراسات عليا" }
            ].map((t, idx) => (
              <Reveal key={idx} className="h-full">
                 <Panel className="p-8 h-full flex flex-col justify-between bg-surface-base border-line">
                   <Quote className="h-8 w-8 text-line mb-6 rotate-180" />
                   <p className="text-lg text-ink-secondary leading-relaxed mb-8 flex-1">"{t.text}"</p>
                   <div>
                     <p className="font-bold text-ink">{t.author}</p>
                     <p className="text-sm text-ink-muted">{t.role}</p>
                   </div>
                 </Panel>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <Reveal>
        <section className="mx-auto max-w-[1280px] px-6 pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-cta px-8 py-16 text-center lg:px-16 shadow-glow">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[bg-pan_3s_linear_infinite]" />
            <div className="relative z-10">
              <h2 className="font-serif text-4xl font-bold text-white lg:text-5xl">هل أنت مستعد للبدء؟</h2>
              <p className="mx-auto mt-4 max-w-md text-lg text-white/90">انضم إلى مجتمعنا وابدأ في بناء سلسلة من النجاحات اليومية الآن.</p>
              <Button
                className="mt-8 bg-surface-base text-cta hover:bg-secondary border-none px-8"
                size="lg"
                onClick={() => router.push("/examples/nabd/app/dashboard")}
              >
                الدخول للمنصة <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        </section>
      </Reveal>
    </LandingShell>
  );
}
