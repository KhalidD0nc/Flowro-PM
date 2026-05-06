"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LandingShell, FadeIn, Reveal, SectionHeader, StaggerContainer, staggerItem, Button, Panel } from '@/components/examples/timeless/app-kit';
import { SiteHeader, SiteFooter } from '@/components/examples/timeless/navigation';
import { PortfolioLightbox } from '@/components/examples/timeless/portfolio-lightbox';
import { SERVICES, PROCESS_STEPS, BENEFITS, PORTFOLIO_WORK, TESTIMONIALS, FAQS, type PortfolioItem } from '@/lib/examples/timeless/mock-data';
import { Compass, Paintbrush, Hammer, Briefcase, Wrench, MessageSquare, ChevronDown, CheckCircle, Target, Gem, Clock, Award, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const getServiceIcon = (name: string) => {
  switch (name) {
    case 'compass': return <Compass className="h-6 w-6" />;
    case 'paintbrush': return <Paintbrush className="h-6 w-6" />;
    case 'hammer': return <Hammer className="h-6 w-6" />;
    case 'briefcase': return <Briefcase className="h-6 w-6" />;
    case 'wrench': return <Wrench className="h-6 w-6" />;
    case 'message': return <MessageSquare className="h-6 w-6" />;
    default: return <CheckCircle className="h-6 w-6" />;
  }
};

const getBenefitIcon = (name: string) => {
  switch (name) {
    case 'target': return <Target className="h-5 w-5" />;
    case 'gem': return <Gem className="h-5 w-5" />;
    case 'clock': return <Clock className="h-5 w-5" />;
    case 'award': return <Award className="h-5 w-5" />;
    default: return <CheckCircle className="h-5 w-5" />;
  }
};

export default function TimelessLandingPage() {
  const router = useRouter();
  const [selectedWork, setSelectedWork] = useState<PortfolioItem | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const openPortfolio = (work: PortfolioItem) => { setSelectedWork(work); setLightboxOpen(true); };

  return (
    <LandingShell topbar={<SiteHeader />} footer={<SiteFooter />}>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-[1440px] px-6 pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="grid gap-12 lg:grid-cols-[55fr_45fr] lg:items-center">
          <FadeIn direction="up" duration={0.8}>
            <div style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--ink-secondary)' }} className="inline-flex items-center gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-widest">
              <span style={{ backgroundColor: 'var(--accent)' }} className="h-2 w-2" />
              Premium Architecture &amp; Construction
            </div>
            <h1 style={{ color: 'var(--ink)' }} className="mt-8 font-serif text-5xl font-normal leading-[1.05] tracking-tight lg:text-7xl">
              Designing and building <br className="hidden lg:block" />
              <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>timeless spaces</span>
            </h1>
            <p style={{ color: 'var(--ink-muted)' }} className="mt-8 max-w-xl text-lg leading-relaxed font-light">
              We translate profound architectural vision into physical permanence. Specializing in highly demanding residential, commercial, and interior masterworks globally.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <Button size="lg" onClick={() => router.push("/examples/timeless/book-consultation")} className="tracking-widest uppercase text-xs">
                Start a Project
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' })} className="tracking-widest uppercase text-xs">
                View Our Work
              </Button>
            </div>
          </FadeIn>

          <FadeIn direction="left" delay={0.2} duration={1}>
            <div className="relative aspect-[3/4] overflow-hidden lg:aspect-[4/5] shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1000"
                alt="Architectural Masterpiece"
                className="h-full w-full object-cover animate-slow-zoom"
                loading="eager"
              />
              <div style={{ background: 'linear-gradient(to top, var(--background), transparent)' }} className="absolute inset-x-0 bottom-0 h-1/3" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="expertise" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line-faint)' }} className="py-24 lg:py-32 border-y">
        <div className="mx-auto max-w-[1440px] px-6">
          <Reveal>
            <SectionHeader eyebrow="Expertise" heading="A holistic discipline" subtitle="From first conceptual sketches to the final placement of artisan fixtures, we maintain absolute control over the entire lifecycle of creation." />
          </Reveal>
          <StaggerContainer className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <motion.div key={s.id} variants={staggerItem}>
                <Panel className="h-full p-8 transition-colors group" style={{ cursor: 'default' }}>
                  <div style={{ color: 'var(--ink-muted)' }} className="mb-6 group-hover:opacity-100 transition-opacity">{getServiceIcon(s.iconName)}</div>
                  <h3 style={{ color: 'var(--ink)' }} className="font-serif text-xl">{s.title}</h3>
                  <p style={{ color: 'var(--ink-secondary)' }} className="mt-4 text-sm leading-relaxed">{s.description}</p>
                </Panel>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Process ── */}
      <section id="process" className="py-24 lg:py-32">
        <div className="mx-auto max-w-[1440px] px-6">
          <Reveal>
            <SectionHeader eyebrow="Methodology" heading="The architecture of execution" subtitle="A stringent, four-phase proprietary workflow guarantees that complexity is completely absorbed by us, presenting only clarity to the client." align="center" />
          </Reveal>
          <div className="mx-auto mt-20 max-w-5xl">
            <StaggerContainer className="grid gap-12 md:grid-cols-4">
              {PROCESS_STEPS.map((step, idx) => (
                <motion.div key={step.step} variants={staggerItem} className="relative flex flex-col items-center text-center">
                  <div style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--line)', color: 'var(--accent)' }} className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border font-serif text-xl">
                    {step.step}
                  </div>
                  <h3 style={{ color: 'var(--ink)' }} className="font-serif text-lg">{step.title}</h3>
                  <p style={{ color: 'var(--ink-muted)' }} className="mt-4 text-sm leading-relaxed">{step.description}</p>
                  {idx < PROCESS_STEPS.length - 1 && (
                    <div style={{ background: `linear-gradient(to right, var(--accent), transparent)` }} className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px" />
                  )}
                </motion.div>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* ── Portfolio ── */}
      <section id="portfolio" style={{ backgroundColor: 'var(--surface)' }} className="py-24 lg:py-32">
        <div className="mx-auto max-w-[1440px] px-6">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <SectionHeader eyebrow="Selected Works" heading="Proof of permanence" />
              <Button variant="outline" className="shrink-0 tracking-widest uppercase text-xs" onClick={() => router.push("/examples/timeless/app")}>
                View Detailed Case Studies
              </Button>
            </div>
          </Reveal>
          <StaggerContainer className="grid gap-6 md:grid-cols-2">
            {PORTFOLIO_WORK.map((work) => (
              <motion.div key={work.id} variants={staggerItem}>
                <button onClick={() => openPortfolio(work)} className="group relative w-full aspect-[4/3] overflow-hidden bg-black text-left focus-visible:outline-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={work.imageUrl} alt={work.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-8">
                    <span style={{ color: 'var(--accent)' }} className="text-xs font-semibold uppercase tracking-widest">{work.category}</span>
                    <h3 className="mt-2 font-serif text-2xl font-medium text-white lg:text-3xl">{work.title}</h3>
                  </div>
                </button>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-[1440px] px-6">
          <Reveal>
            <div className="grid gap-16 lg:grid-cols-[1fr_2fr]">
              <SectionHeader eyebrow="The Standard" heading="Why clients demand our studio" />
              <StaggerContainer className="grid gap-8 sm:grid-cols-2">
                {BENEFITS.map((benefit) => (
                  <motion.div key={benefit.title} variants={staggerItem} className="flex gap-4">
                    <div style={{ color: 'var(--accent)' }} className="shrink-0 mt-1">{getBenefitIcon(benefit.iconName)}</div>
                    <div>
                      <h4 style={{ color: 'var(--ink)' }} className="font-medium">{benefit.title}</h4>
                      <p style={{ color: 'var(--ink-muted)' }} className="mt-2 text-sm leading-relaxed">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </StaggerContainer>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--line-faint)' }} className="py-24 lg:py-32 border-y">
        <div className="mx-auto max-w-[1440px] px-6">
          <StaggerContainer className="grid gap-8 lg:grid-cols-3">
            {TESTIMONIALS.map((t, idx) => (
              <motion.div key={idx} variants={staggerItem}>
                <Panel className="flex h-full flex-col p-8">
                  <div style={{ color: 'var(--accent)' }} className="flex gap-1 mb-6">
                    {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <blockquote style={{ color: 'var(--ink)' }} className="flex-grow font-serif text-lg leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div style={{ borderTopColor: 'var(--line)' }} className="mt-8 border-t pt-6">
                    <p style={{ color: 'var(--ink)' }} className="font-medium uppercase tracking-widest text-xs">{t.clientName}</p>
                    <p style={{ color: 'var(--ink-muted)' }} className="mt-1 text-sm">{t.clientType} &mdash; {t.projectType}</p>
                  </div>
                </Panel>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 lg:py-32 max-w-4xl mx-auto px-6">
        <Reveal>
          <SectionHeader eyebrow="Clarifications" heading="Frequently asked questions" align="center" />
        </Reveal>
        <div style={{ borderColor: 'var(--line)' }} className="mt-16 divide-y">
          {FAQS.map((faq, index) => (
            <div key={index} className="py-6">
              <button className="flex w-full items-center justify-between text-left focus:outline-none" onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                <span style={{ color: 'var(--ink)' }} className="font-serif text-xl">{faq.question}</span>
                <ChevronDown style={{ color: 'var(--ink-muted)' }} className={`h-5 w-5 transition-transform duration-300 ${openFaq === index ? "rotate-180" : ""}`} />
              </button>
              {openFaq === index && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ color: 'var(--ink-secondary)' }} className="mt-4 text-base leading-relaxed">
                  {faq.answer}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-black py-32 lg:py-48 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1613490908578-15c00e6205e4?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center opacity-10" />
        <div className="mx-auto max-w-4xl px-6 relative z-10 text-center">
          <Reveal>
            <h2 className="font-serif text-5xl lg:text-6xl font-normal text-white">Commit to your legacy.</h2>
            <p className="mt-6 text-xl text-white/70 max-w-2xl mx-auto font-light">
              Schedule a private consultation with our principal architects to explore the boundaries of what is structurally possible.
            </p>
            <div className="mt-12 flex justify-center">
              <Button size="lg" onClick={() => router.push("/examples/timeless/book-consultation")} className="tracking-widest uppercase text-sm px-12">
                Initiate Project Dialog
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <PortfolioLightbox item={selectedWork} open={lightboxOpen} onClose={() => setLightboxOpen(false)} />
    </LandingShell>
  );
}
