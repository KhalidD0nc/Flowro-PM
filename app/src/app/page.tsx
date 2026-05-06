"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MousePointerClick, X } from "lucide-react";

const repoUrl = "https://github.com/KhalidD0nc/Flowro-PM";

const jsonLdSoftware = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "Flowro",
  codeRepository: repoUrl,
  programmingLanguage: ["TypeScript", "React"],
  runtimePlatform: "Next.js",
  description:
    "Open-source, self-hosted plan-to-app builder that turns messy ideas into approved plans, local build runs, and previewable apps.",
  url: "https://flowro.app",
  license: "https://github.com/KhalidD0nc/Flowro-PM",
};

const pipelineSteps = [
  { label: "Idea & Plan", detail: "Turn messy thoughts into an approved execution contract." },
  { label: "AI Builder", detail: "Run the build worker where your keys and files live." },
  { label: "Ship or iterate", detail: "Open the generated app locally and inspect the real output." },
];

function IntegrationFlowBanner() {
  const shouldReduceMotion = useReducedMotion();
  const cursorMotion = shouldReduceMotion
    ? { opacity: 1, x: 0, y: 0, scale: 1 }
    : {
      opacity: [0, 1, 1, 1, 0],
      x: ["-132px", "-92px", "-92px", "132px", "132px"],
      y: [18, 0, 0, 0, 0],
      scale: [0.95, 1, 0.82, 1, 0.82],
    };

  return (
    <motion.section
      aria-label="Click to connect Supabase and deploy on Vercel"
      className="relative mt-10 w-full max-w-3xl text-left sm:mt-12"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative flex flex-col items-center gap-4 rounded-[18px] border-2 border-dashed border-[#201815]/35 px-4 py-4 sm:flex-row sm:justify-center sm:gap-8">
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-[#201815]"
          aria-hidden="true"
          animate={cursorMotion}
          transition={shouldReduceMotion ? undefined : { duration: 3.1, repeat: Infinity, repeatDelay: 0.45, ease: "easeInOut" }}
        >
          <div className="relative">
            <MousePointerClick className="size-8 fill-[#fff7e3] stroke-[2.4]" />
            <motion.span
              className="absolute -right-2 -top-2 size-4 rounded-full border-2 border-[#201815] bg-[#f97316]"
              animate={shouldReduceMotion ? undefined : { scale: [0.5, 1.7, 0.5], opacity: [0, 0.8, 0] }}
              transition={shouldReduceMotion ? undefined : { duration: 0.8, repeat: Infinity, repeatDelay: 0.8 }}
            />
          </div>
        </motion.div>

        <div className="flex w-full max-w-[230px] flex-col items-center gap-2 sm:w-auto">
          <motion.div
            className="relative flex min-h-14 items-center justify-center"
            animate={shouldReduceMotion ? undefined : { y: [0, -3, 0] }}
            transition={shouldReduceMotion ? undefined : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image src="/connect-supabase-light.svg" alt="Connect Supabase database" width={156} height={31} className="h-auto w-[156px] max-w-full" />
          </motion.div>
          <span className="rounded-full border-2 border-[#201815] bg-[#67d7c1] px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#201815] shadow-[3px_3px_0_#201815]">
            Click database
          </span>
        </div>

        <div className="relative h-8 w-px bg-[#201815]/45 sm:h-px sm:w-20" aria-hidden="true">
          <motion.span
            className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-[#f97316] sm:hidden"
            animate={shouldReduceMotion ? undefined : { y: ["0rem", "2rem"], opacity: [0.2, 1, 0.2] }}
            transition={shouldReduceMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute left-0 top-1/2 hidden size-2 -translate-y-1/2 rounded-full bg-[#f97316] sm:block"
            animate={shouldReduceMotion ? undefined : { x: ["0rem", "5rem"], opacity: [0.2, 1, 0.2] }}
            transition={shouldReduceMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="flex w-full max-w-[230px] flex-col items-center gap-2 sm:w-auto">
          <motion.div
            className="flex min-h-14 items-center justify-center gap-3"
            animate={shouldReduceMotion ? undefined : { rotate: [0, 1.5, 0] }}
            transition={shouldReduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image src="/vercel-logotype-light.png" alt="Vercel wordmark" width={148} height={29} className="h-[18px] w-auto" />
          </motion.div>
          <span className="rounded-full border-2 border-[#201815] bg-[#ffd75a] px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#201815] shadow-[3px_3px_0_#201815]">
            Click deploy
          </span>
        </div>
      </div>
    </motion.section>
  );
}


function TypingPlaceholder() {
  const [text, setText] = React.useState("");
  const phrases = [
    "Build me Landing Page for a Salon...",
    "Build me Landing Page for a Habit Tracker...",
    "Build me Landing Page for an Architecture Studio...",
  ];
  const [index, setIndex] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [speed, setSpeed] = React.useState(150);

  React.useEffect(() => {
    const handleTyping = () => {
      const currentPhrase = phrases[index];
      if (isDeleting) {
        setText(currentPhrase.substring(0, text.length - 1));
        setSpeed(50);
      } else {
        setText(currentPhrase.substring(0, text.length + 1));
        setSpeed(150);
      }

      if (!isDeleting && text === currentPhrase) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && text === "") {
        setIsDeleting(false);
        setIndex((prev) => (prev + 1) % phrases.length);
      }
    };

    const timer = setTimeout(handleTyping, speed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, index, speed]);

  return <span>{text}</span>;
}

export default function Home() {
  const [activePreview, setActivePreview] = useState<string | null>(null);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f1e5] text-[#201815]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
      />

      <section className="relative border-b border-[#201815]/15">
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #201815 1px, transparent 1px), linear-gradient(to bottom, #201815 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        <div className="absolute left-[8%] top-20 h-32 w-32 rotate-12 rounded-[18px] border-2 border-[#201815] bg-[#ffd75a] shadow-[10px_10px_0_#201815] max-md:hidden" />
        <div className="absolute bottom-10 right-[7%] h-28 w-44 -rotate-6 rounded-[10px] border-2 border-[#201815] bg-[#67d7c1] shadow-[10px_10px_0_#201815] max-lg:hidden" />

        <div className="relative mx-auto flex max-w-[1400px] flex-col px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3" aria-label="Flowro home">
              <img src="/logo.svg" alt="" className="size-9" />
              <span className="text-lg font-black tracking-tight">Flowro</span>
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-bold md:flex">
              <a className="hover:text-[#c2410c]" href="#pipeline">Pipeline</a>
              <a className="hover:text-[#c2410c]" href="#showcase">Showcase</a>
              <a className="hover:text-[#c2410c]" href="#pricing">Pricing</a>
              <a className="hover:text-[#c2410c]" href="#quickstart">Self-host</a>
            </nav>
            <a
              href={repoUrl}
              className="rounded-full border-2 border-[#201815] bg-[#201815] px-4 py-2 text-sm font-black text-white shadow-[4px_4px_0_#f97316] transition-transform hover:-translate-y-0.5"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </header>

          <div className="flex flex-col items-center pt-16 pb-12 text-center lg:pt-24 lg:pb-16">
            <h1 className="max-w-[1000px] text-5xl font-black leading-[1.05] tracking-tight text-[#201815] sm:text-6xl lg:text-[76px]">
              Build apps by chatting to AI.<br/><i className="font-serif italic font-normal text-[#c2410c]">Chat it into existence.</i>
            </h1>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <a
                href="#quickstart"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#201815] bg-[#f97316] px-8 py-4 text-base font-black text-[#201815] shadow-[7px_7px_0_#201815] transition-transform hover:-translate-y-1"
              >
                <span className="material-symbols-outlined text-[22px]">bolt</span>
                Get Started
              </a>
              <a
                href={repoUrl}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#201815] bg-white px-8 py-4 text-base font-black text-[#201815] shadow-[7px_7px_0_#201815] transition-transform hover:-translate-y-1"
                rel="noreferrer"
                target="_blank"
              >
                <span className="material-symbols-outlined text-[22px]">code</span>
                GitHub
              </a>
            </div>

            <IntegrationFlowBanner />

            {/* The Shipper-style Workspace Mockup */}
            <div className="relative mt-16 w-full max-w-[1400px] text-left sm:mt-20">
              <div className="absolute -left-6 top-20 h-24 w-24 rotate-12 rounded-[14px] border-2 border-[#201815] bg-[#ef4444] max-sm:hidden" />
              <div className="absolute -right-8 bottom-10 h-32 w-32 -rotate-12 rounded-[20px] border-2 border-[#201815] bg-[#67d7c1] max-lg:hidden" />
              
              <div className="relative overflow-hidden rounded-[24px] border-2 border-[#201815] bg-white shadow-[16px_16px_0_#201815] flex flex-col md:flex-row h-[700px]">
                {/* Left Pane: Composer / Plan */}
                <div className="flex flex-col border-r-2 border-[#201815] bg-[#f8f1e5] w-full md:w-[500px] h-full shrink-0 relative">
                  <div className="flex items-center gap-2 border-b-2 border-[#201815] bg-white px-4 py-3 shrink-0">
                    <span className="size-3 rounded-full bg-[#ef4444] border border-[#201815]" />
                    <span className="size-3 rounded-full bg-[#ffd75a] border border-[#201815]" />
                    <span className="size-3 rounded-full bg-[#67d7c1] border border-[#201815]" />
                    <span className="ml-2 font-mono text-sm font-black uppercase tracking-[0.2em] text-[#201815]">
                      Flowro Workspace
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 pb-32">
                    <div className="space-y-4">
                      <div className="rounded-xl border-2 border-[#201815] bg-white p-4 shadow-[4px_4px_0_#201815]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#16a34a]">
                            <span className="size-2 rounded-full bg-[#16a34a] animate-pulse" />
                            Plan Approved
                          </div>
                        </div>
                        <h3 className="font-black text-[#201815] leading-tight mb-2">Timeless Spaces Studio</h3>
                        <p className="text-sm font-medium text-[#5f5045] line-clamp-3">
                          Create a modern landing page for an architecture and construction company. The company designs and builds residential, commercial, and luxury spaces...
                        </p>
                      </div>
                      
                    </div>
                  </div>

                  {/* Composer Input Box */}
                  <div className="absolute bottom-5 left-5 right-5 z-10">
                    <div className="rounded-2xl border-2 border-[#201815] bg-white p-2 shadow-[6px_6px_0_#67d7c1]">
                      <div className="flex items-end gap-2">
                        <div className="w-full p-2 text-sm font-medium text-[#201815]/40 min-h-[60px] cursor-default select-none">
                          <TypingPlaceholder />
                          <span className="inline-block w-[2px] h-4 bg-[#f97316] ml-1 animate-pulse align-middle" />
                        </div>
                        <button className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f97316] border-2 border-[#201815] text-[#201815] hover:-translate-y-0.5 transition-transform" aria-label="Send message">
                          <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Pane: Generated App Preview */}
                <div className="flex-1 bg-[#1a1514] relative overflow-hidden flex flex-col">
                  
                  {/* Fake App View Container */}
                  <div className="flex-1 relative bg-[#0a0a0a] p-4 sm:p-8 flex items-center justify-center overflow-hidden">
                     <div className="relative w-full h-full max-w-[900px] rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-[#0d0d0d] font-serif">
                        <div className="absolute inset-0 p-8 sm:p-10 flex flex-col">
                          {/* Header */}
                          <div className="flex justify-between items-center w-full mb-12">
                            <div className="flex items-center gap-2">
                              <div className="size-4 bg-white" />
                              <span className="font-serif text-white font-bold tracking-[0.2em] text-sm uppercase">Timeless</span>
                            </div>
                            <div className="hidden lg:flex gap-8 text-[9px] uppercase tracking-[0.2em] text-white/50 font-bold">
                              <span>Expertise</span><span>Portfolio</span><span>Process</span><span>App</span>
                            </div>
                            <button className="text-[10px] text-[#0d0d0d] bg-[#d4c39c] font-black uppercase tracking-[0.1em] px-5 py-2.5 rounded-full hover:bg-white transition-colors">Start a Project</button>
                          </div>
                          
                          <div className="flex-1 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
                            <div>
                              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 mb-8">
                                <div className="size-2 bg-[#d4c39c]" />
                                <p className="text-[9px] text-white/60 uppercase tracking-[0.2em] font-bold">Premium Architecture & Construction</p>
                              </div>
                              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-white leading-[1.1] mb-8">Designing and<br/>building<br/><i className="font-serif italic text-[#d4c39c] font-normal">timeless spaces</i>.</h2>
                              <p className="text-sm text-white/40 leading-relaxed max-w-sm mb-10 font-sans">We translate profound architectural vision into physical permanence. Specializing in highly demanding residential, commercial, and interior masterworks globally.</p>
                              <div className="flex gap-4 font-sans">
                                <button className="px-8 py-4 bg-[#d4c39c] text-[#0d0d0d] text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors">Start a project</button>
                                <button className="px-8 py-4 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:border-white transition-colors">View our work</button>
                              </div>
                            </div>
                            
                            {/* Hero Image */}
                            <div className="relative h-full max-h-[450px] w-full group overflow-hidden rounded-sm">
                               <img 
                                 src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200" 
                                 alt="Timeless Spaces Preview" 
                                 className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] group-hover:scale-105 transition-transform duration-700"
                               />
                            </div>
                          </div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="showcase" className="border-b border-[#201815]/15 px-5 py-20 sm:px-8 lg:px-10 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl text-[#201815]">Built with Flowro</h2>
            <p className="mt-4 text-lg font-medium text-[#5f5045]">Real apps generated locally, without cloud lock-in.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Example 1 */}
            <div className="rounded-2xl border-2 border-[#201815] bg-[#f8f1e5] overflow-hidden shadow-[8px_8px_0_#201815] flex flex-col transition-transform hover:-translate-y-1">
              <div className="border-b-2 border-[#201815] bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full border border-[#201815] bg-[#ef4444]"></span>
                    <span className="size-3 rounded-full border border-[#201815] bg-[#ffd75a]"></span>
                    <span className="size-3 rounded-full border border-[#201815] bg-[#67d7c1]"></span>
                  </div>
                  <button onClick={() => setActivePreview("/examples/timeless/")} className="text-[10px] font-bold bg-[#f97316] text-white px-2 py-1 rounded-full hover:bg-[#ea580c] transition-colors border border-[#201815]">
                    Open Interactive Preview
                  </button>
                </div>
                <h3 className="font-black text-lg text-[#201815]">Timeless Spaces Studio</h3>
              </div>
              <div className="p-4 flex-1">
                <div onClick={() => setActivePreview("/examples/timeless/")} className="block rounded-xl border-2 border-[#201815] overflow-hidden bg-white aspect-[4/3] relative group cursor-pointer">
                  <iframe 
                    src="/examples/timeless/" 
                    title="Timeless Spaces Preview" 
                    className="absolute inset-0 w-full h-full border-none pointer-events-none"
                    tabIndex={-1}
                  />
                  <div className="absolute inset-0 bg-[#201815]/10 flex items-center justify-center backdrop-blur-[1px] group-hover:backdrop-blur-none group-hover:bg-transparent transition-all duration-300">
                    <div className="bg-[#201815] text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-xl border border-white/20 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      Click to Try
                    </div>
                  </div>
                  </div>
                </div>
              </div>

            {/* Example 2 */}
            <div className="rounded-2xl border-2 border-[#201815] bg-[#f8f1e5] overflow-hidden shadow-[8px_8px_0_#201815] flex flex-col transition-transform hover:-translate-y-1">
              <div className="border-b-2 border-[#201815] bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full border border-[#201815] bg-[#ef4444]"></span>
                    <span className="size-3 rounded-full border border-[#201815] bg-[#ffd75a]"></span>
                    <span className="size-3 rounded-full border border-[#201815] bg-[#67d7c1]"></span>
                  </div>
                  <button onClick={() => setActivePreview("/examples/salon-rawnq/")} className="text-[10px] font-bold bg-[#f97316] text-white px-2 py-1 rounded-full hover:bg-[#ea580c] transition-colors border border-[#201815]">
                    Open Interactive Preview
                  </button>
                </div>
                <h3 className="font-black text-lg text-[#201815] text-right" dir="rtl">صالون رونق</h3>
                <p className="text-xs font-bold text-[#c2410c] uppercase tracking-widest mt-1">Arabic Salon Booking App</p>
              </div>
              <div className="p-4 flex-1">
                <div onClick={() => setActivePreview("/examples/salon-rawnq/")} className="block rounded-xl border-2 border-[#201815] overflow-hidden bg-white aspect-[4/3] relative group cursor-pointer">
                  <iframe 
                    src="/examples/salon-rawnq/" 
                    title="Salon Rawnq Preview" 
                    className="absolute inset-0 w-full h-full border-none pointer-events-none"
                    tabIndex={-1}
                  />
                  <div className="absolute inset-0 bg-[#201815]/10 flex items-center justify-center backdrop-blur-[1px] group-hover:backdrop-blur-none group-hover:bg-transparent transition-all duration-300">
                    <div className="bg-[#201815] text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-xl border border-white/20 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      Click to Try
                    </div>
                  </div>
                  </div>
                </div>
              </div>

            {/* Example 3 */}
            <div className="rounded-2xl border-2 border-[#201815] bg-[#f8f1e5] overflow-hidden shadow-[8px_8px_0_#201815] flex flex-col transition-transform hover:-translate-y-1">
              <div className="border-b-2 border-[#201815] bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full border border-[#201815] bg-[#ef4444]"></span>
                    <span className="size-3 rounded-full border border-[#201815] bg-[#ffd75a]"></span>
                    <span className="size-3 rounded-full border border-[#201815] bg-[#67d7c1]"></span>
                  </div>
                  <button onClick={() => setActivePreview("/examples/nabd/")} className="text-[10px] font-bold bg-[#f97316] text-white px-2 py-1 rounded-full hover:bg-[#ea580c] transition-colors border border-[#201815]">
                    Open Interactive Preview
                  </button>
                </div>
                <h3 className="font-black text-lg text-[#201815] text-right" dir="rtl">نبض</h3>
                <p className="text-xs font-bold text-[#c2410c] uppercase tracking-widest mt-1">Habit Tracker</p>
              </div>
              <div className="p-4 flex-1">
                <div onClick={() => setActivePreview("/examples/nabd/")} className="block rounded-xl border-2 border-[#201815] overflow-hidden bg-white aspect-[4/3] relative group cursor-pointer">
                  <iframe 
                    src="/examples/nabd/" 
                    title="Dashboard Preview" 
                    className="absolute inset-0 w-full h-full border-none pointer-events-none"
                    tabIndex={-1}
                  />
                  <div className="absolute inset-0 bg-[#201815]/10 flex items-center justify-center backdrop-blur-[1px] group-hover:backdrop-blur-none group-hover:bg-transparent transition-all duration-300">
                    <div className="bg-[#201815] text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-xl border border-white/20 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      Click to Try
                    </div>
                  </div>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#201815]/15 bg-[#fffaf0] px-5 py-18 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c2410c]">Cloud? No thanks.</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Hosted landing page. Self-hosted everything important.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Your API keys stay yours.", "Your workspace does the building.", "Your agents get a plan before they improvise."].map((item) => (
              <div key={item} className="rounded-2xl border-2 border-[#201815] bg-[#f8f1e5] p-5 shadow-[6px_6px_0_#201815]">
                <span className="material-symbols-outlined mb-4 text-3xl text-[#c2410c]">check_circle</span>
                <p className="text-lg font-black leading-6">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pipeline" className="border-b border-[#201815]/15 px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              How it works.
            </h2>
          </div>
          <div className="mt-20 flex flex-col gap-24">
            {pipelineSteps.map((step, index) => (
              <div key={step.label} className="group flex flex-col md:flex-row gap-10 md:gap-20 items-start">
                <div className="relative shrink-0">
                  <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-[#201815] text-2xl font-black text-white shadow-[10px_10px_0_#f97316] transition-all duration-500 group-hover:shadow-[14px_14px_0_#f97316] group-hover:-translate-x-1 group-hover:-translate-y-1">
                    0{index + 1}
                  </div>
                  {index < pipelineSteps.length - 1 && (
                    <div className="hidden md:block absolute top-24 left-1/2 -translate-x-1/2 h-24 w-px bg-gradient-to-b from-[#201815]/20 to-transparent" />
                  )}
                </div>
                <div className="flex-1 pt-4">
                  <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-[#201815] mb-6 transition-colors group-hover:text-[#c2410c]">
                    {step.label}
                  </h3>
                  <p className="text-lg sm:text-2xl font-medium leading-relaxed text-[#5f5045] max-w-4xl">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section id="pricing" className="border-b border-[#201815]/15 bg-white px-5 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl text-[#201815]">Pricing</h2>
            <p className="mt-4 text-lg font-medium text-[#5f5045]">Choose how you want to build.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Self-Hosted Plan */}
            <div className="group relative rounded-[40px] border-2 border-[#201815] bg-[#f8f1e5] p-10 shadow-[12px_12px_0_#201815] transition-all hover:-translate-y-1">
              <div className="mb-8">
                <h3 className="text-2xl font-black text-[#201815]">Self-Hosted</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-black text-[#201815]">$0</span>
                  <span className="text-lg font-bold text-[#5f5045]/60">/forever</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10">
                {["Open-source codebase", "Unlimited local builds", "Bring your own API keys", "100% data privacy"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-lg font-bold text-[#201815]">
                    <span className="material-symbols-outlined text-[#16a34a]">check_circle</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a href="#quickstart" className="block w-full rounded-2xl border-2 border-[#201815] bg-[#201815] py-4 text-center text-lg font-black text-white transition-all hover:bg-[#f97316] hover:shadow-[4px_4px_0_#201815]">
                Get Started
              </a>
            </div>

            {/* Cloud Plan */}
            <div className="group relative rounded-[40px] border-2 border-[#201815]/10 bg-white p-10 transition-all hover:border-[#201815]/20">
              <div className="absolute top-6 right-6">
                <span className="rounded-full bg-[#f97316]/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#f97316]">
                  Coming Soon
                </span>
              </div>
              <div className="mb-8">
                <h3 className="text-2xl font-black text-[#201815]/40">Flowro Cloud</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-black text-[#201815]/20">--</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 opacity-40">
                {["Managed infrastructure", "One-click deployments", "Team collaboration", "Cloud build worker"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-lg font-bold text-[#201815]">
                    <span className="material-symbols-outlined">schedule</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button disabled className="w-full rounded-2xl border-2 border-[#201815]/10 bg-gray-50 py-4 text-center text-lg font-black text-[#201815]/20 cursor-not-allowed">
                Waitlist Opening Soon
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="quickstart" className="border-b border-[#201815]/15 bg-[#fffaf0] px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c2410c]">Self-host in minutes</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Clone it, feed it keys, run it where you can see it.
            </h2>
            <p className="mt-5 text-lg font-medium leading-8 text-[#6b5b4f]">
              Vercel shows the brochure. Your machine runs the actual workshop.
            </p>
          </div>
          <div className="rounded-[22px] border-2 border-[#201815] bg-[#15110f] p-4 shadow-[12px_12px_0_#f97316]">
            <pre className="overflow-x-auto rounded-xl p-4 font-mono text-sm leading-7 text-[#fffaf0] sm:p-6"><code>{`git clone https://github.com/KhalidD0nc/Flowro-PM.git
cd Flowro-PM
npm install
cd app
npm install
cp env.example .env.local

# add Firebase and OpenRouter keys
npm run dev`}</code></pre>
          </div>
        </div>
      </section>


      <footer className="border-t border-[#201815]/15 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm font-bold text-[#6b5b4f] sm:flex-row sm:items-center sm:justify-between">
          <span>Flowro. Open-source plan-to-app builder.</span>
          <a className="text-[#201815] underline decoration-[#f97316] decoration-2 underline-offset-4" href={repoUrl} rel="noreferrer" target="_blank">
            github.com/KhalidD0nc/Flowro-PM
          </a>
        </div>
      </footer>
      <AnimatePresence>
        {activePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm"
            onClick={() => setActivePreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-6xl h-[85vh] bg-[#f8f1e5] rounded-2xl border-4 border-[#201815] shadow-[12px_12px_0_#201815] overflow-hidden flex flex-col"
            >
              <div className="h-12 border-b-4 border-[#201815] bg-white flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full border-2 border-[#201815] bg-[#ef4444]"></span>
                  <span className="size-3 rounded-full border-2 border-[#201815] bg-[#ffd75a]"></span>
                  <span className="size-3 rounded-full border-2 border-[#201815] bg-[#67d7c1]"></span>
                  <span className="ml-4 font-mono text-xs font-bold text-[#201815] bg-gray-100 px-3 py-1 rounded-md border border-[#201815]/20 hidden sm:block">
                    {activePreview}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <a
                    href={activePreview}
                    target="_blank"
                    className="text-xs font-bold text-[#f97316] hover:underline"
                  >
                    Open in New Tab
                  </a>
                  <button
                    onClick={() => setActivePreview(null)}
                    className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <X className="size-5 text-[#201815]" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white relative">
                <iframe
                  src={activePreview}
                  className="absolute inset-0 w-full h-full border-none"
                  title="Interactive Preview"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
