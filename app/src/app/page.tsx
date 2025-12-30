"use client"

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleComingSoon = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="bg-[#0D1117] text-white overflow-x-hidden w-full">
      <div className="relative flex min-h-screen w-full flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-[#30363d] bg-[#0D1117]/80 backdrop-blur-md px-6 lg:px-10 py-3">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="size-8 text-[#137fec]">
              <span className="material-symbols-outlined text-[32px]">hourglass_top</span>
            </div>
            <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Flowro AI</h2>
          </div>
          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#9dabb9]">
              <a className="hover:text-[#137fec] transition-colors" href="#how-it-works">How it Works</a>
            </nav>
            <Link
              href="/auth"
              className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-[#137fec] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#137fec]/90 transition-all"
            >
              <span className="truncate">Get Started</span>
            </Link>
          </div>
        </header>

        <div className="flex h-full grow flex-col">
          {/* Hero Section */}
          <section className="relative flex flex-col pt-16 pb-20 px-6 lg:px-20 overflow-hidden" style={{
            backgroundImage: 'linear-gradient(to right, rgba(48, 54, 61, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(48, 54, 61, 0.2) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#137fec]/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 max-w-[1400px] mx-auto z-10 w-full">
              {/* Left side - Text content */}
              <div className="flex flex-col gap-8 flex-1 max-w-[640px]">
                <div className="flex flex-col gap-6">
                  <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.1] tracking-[-0.033em]">
                    Your AI<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#137fec] to-blue-300">Product Manager.</span>
                  </h1>
                  <h2 className="text-[#9dabb9] text-lg sm:text-xl font-normal leading-relaxed max-w-[580px]">
                    Flowro takes the burden of documentation off your shoulders. We convert messy product docs, transcripts, and notes into a single, clean <span className="text-white font-semibold">Unified Blueprint (UBP)</span>, so you can just build.
                  </h2>
                </div>
              </div>

              {/* Right side - Terminal/Engine visualization */}
              <div className="flex-1 w-full max-w-[750px] relative">
                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] shadow-2xl overflow-hidden relative group">
                  {/* Terminal header */}
                  <div className="flex items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4 py-3 z-30 relative">
                    <div className="flex gap-2">
                      <div className="size-3 rounded-full bg-[#ff5f56]"></div>
                      <div className="size-3 rounded-full bg-[#ffbd2e]"></div>
                      <div className="size-3 rounded-full bg-[#27c93f]"></div>
                    </div>
                    <div className="text-xs font-mono text-[#7d8590] uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[#137fec]">hourglass_top</span>
                      Flowro Engine
                    </div>
                    <div className="flex gap-2">
                      <div className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/20 text-green-500 border border-green-500/20">Active</div>
                    </div>
                  </div>

                  {/* Terminal content */}
                  <div className="relative h-[460px] bg-[#0d1117] overflow-hidden p-6 flex items-center justify-center">
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'radial-gradient(#30363d 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                      opacity: 0.3
                    }}></div>

                    <div className="relative w-full max-w-[600px] h-[300px] flex items-center justify-between z-10">
                      {/* Messy Input side */}
                      <div className="relative w-32 h-full flex flex-col justify-center items-center">
                        <div className="absolute inset-0 border border-dashed border-white/10 rounded-xl bg-white/5"></div>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0d1117] px-2 text-[10px] text-gray-500 font-mono uppercase tracking-widest whitespace-nowrap">Messy Input</div>

                        {/* Floating document icons */}
                        <div className="absolute top-10 left-2 p-3 bg-[#1e2329] border border-[#30363d] rounded-lg shadow-lg rotate-[-6deg] hover:scale-110 transition-transform cursor-default z-10 animate-[float_4s_ease-in-out_infinite]">
                          <span className="material-symbols-outlined text-blue-400">description</span>
                        </div>
                        <div className="absolute top-24 right-2 p-3 bg-[#1e2329] border border-[#30363d] rounded-lg shadow-lg rotate-[12deg] hover:scale-110 transition-transform cursor-default z-20 animate-[float_5s_ease-in-out_infinite_1s]">
                          <span className="material-symbols-outlined text-yellow-500">sticky_note_2</span>
                        </div>
                        <div className="absolute bottom-20 left-4 p-3 bg-[#1e2329] border border-[#30363d] rounded-lg shadow-lg rotate-[-3deg] hover:scale-110 transition-transform cursor-default z-0 animate-[float_4s_ease-in-out_infinite_0.5s]">
                          <span className="material-symbols-outlined text-purple-400">video_file</span>
                        </div>
                        <div className="absolute bottom-8 right-6 p-3 bg-[#1e2329] border border-[#30363d] rounded-lg shadow-lg rotate-[8deg] hover:scale-110 transition-transform cursor-default z-10 animate-[float_6s_ease-in-out_infinite_2s]">
                          <span className="material-symbols-outlined text-green-400">chat</span>
                        </div>
                      </div>

                      {/* Middle - empty flow area */}
                      <div className="flex-1 h-full relative overflow-hidden"></div>

                      {/* Unified Blueprint side */}
                      <div className="relative w-36 h-full flex flex-col justify-center items-center">
                        <div className="absolute inset-0 border border-dashed border-white/10 rounded-xl bg-white/5"></div>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0d1117] px-2 text-[10px] text-gray-500 font-mono uppercase tracking-widest whitespace-nowrap">Unified Blueprint</div>

                        <div className="relative z-10 w-28 h-40 bg-[#161b22] border border-[#137fec]/50 rounded-lg shadow-[0_0_30px_rgba(19,127,236,0.15)] flex flex-col p-4 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                          <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                            <span className="material-symbols-outlined text-[#137fec] text-[14px]">article</span>
                            <div className="h-1.5 w-10 bg-white/20 rounded-full"></div>
                          </div>
                          <div className="space-y-2 flex-1">
                            <div className="flex gap-1.5">
                              <div className="h-1 w-2 bg-[#137fec]/40 rounded-full"></div>
                              <div className="h-1 w-16 bg-white/10 rounded-full"></div>
                            </div>
                            <div className="flex gap-1.5">
                              <div className="h-1 w-2 bg-[#137fec]/40 rounded-full"></div>
                              <div className="h-1 w-12 bg-white/10 rounded-full"></div>
                            </div>
                            <div className="flex gap-1.5">
                              <div className="h-1 w-2 bg-[#137fec]/40 rounded-full"></div>
                              <div className="h-1 w-14 bg-white/10 rounded-full"></div>
                            </div>
                            <div className="mt-2 p-1.5 bg-[#137fec]/5 rounded border border-[#137fec]/10">
                              <div className="h-1 w-full bg-[#137fec]/20 rounded-full mb-1"></div>
                              <div className="h-1 w-2/3 bg-[#137fec]/20 rounded-full"></div>
                            </div>
                          </div>
                          <div className="absolute -top-2 -right-2 bg-green-500 text-black rounded-full p-0.5 shadow-lg scale-0 group-hover:scale-100 transition-transform delay-300 duration-300">
                            <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terminal footer */}
                  <div className="flex items-center justify-between border-t border-[#30363d] bg-[#0d1117] px-4 py-3">
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 opacity-50 animate-pulse">
                        <span className="material-symbols-outlined text-[14px] text-green-500">terminal</span>
                        <span className="text-[10px] font-mono text-[#7d8590]">Merging disjointed contexts...</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 bg-[#161b22] rounded-full overflow-hidden">
                        <div className="h-full bg-[#137fec] w-full"></div>
                      </div>
                      <span className="text-[10px] font-mono text-[#7d8590]">100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="absolute -right-20 -bottom-20 w-[400px] h-[400px] bg-[#137fec]/20 blur-[100px] rounded-full pointer-events-none z-0"></div>
      </div>

      {/* Problems Section */}
      <section className="py-20 px-6 lg:px-40 bg-[#161b22] border-y border-[#30363d]">
        <div className="max-w-[960px] mx-auto flex flex-col gap-12">
          <div className="flex flex-col gap-4 text-center">
            <h2 className="text-3xl font-bold leading-tight tracking-[-0.015em]">The Vibe Killer: Context Switching</h2>
            <p className="text-[#9dabb9] text-lg max-w-[600px] mx-auto">Stop losing time searching for requirements. Flowro eliminates the chaos of scattered documentation.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="group flex flex-col gap-4 rounded-xl border border-[#30363d] bg-[#0D1117] p-6 hover:border-[#137fec]/50 transition-colors">
              <div className="size-12 rounded-lg bg-[#283039] flex items-center justify-center text-white group-hover:bg-[#137fec]/20 group-hover:text-[#137fec] transition-colors">
                <span className="material-symbols-outlined text-[28px]">description</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold">Scattered Docs</h3>
                <p className="text-[#9dabb9] text-sm leading-relaxed">Requirements buried in drive folders, Slack threads, and forgotten Jira tickets.</p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="group flex flex-col gap-4 rounded-xl border border-[#30363d] bg-[#0D1117] p-6 hover:border-[#137fec]/50 transition-colors">
              <div className="size-12 rounded-lg bg-[#283039] flex items-center justify-center text-white group-hover:bg-[#137fec]/20 group-hover:text-[#137fec] transition-colors">
                <span className="material-symbols-outlined text-[28px]">sync_problem</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold">Context Switching</h3>
                <p className="text-[#9dabb9] text-sm leading-relaxed">Constantly breaking your flow state to find answers to simple logic questions.</p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="group flex flex-col gap-4 rounded-xl border border-[#30363d] bg-[#0D1117] p-6 hover:border-[#137fec]/50 transition-colors">
              <div className="size-12 rounded-lg bg-[#283039] flex items-center justify-center text-white group-hover:bg-[#137fec]/20 group-hover:text-[#137fec] transition-colors">
                <span className="material-symbols-outlined text-[28px]">schedule</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold">Slow Velocity</h3>
                <p className="text-[#9dabb9] text-sm leading-relaxed">Weeks wasted on clarification cycles before you write a single line of effective code.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UBP Visualizer Section */}
      <section className="py-24 px-6 lg:px-20 bg-[#0d1117] border-b border-[#30363d] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#137fec]/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-[1200px] mx-auto flex flex-col gap-16 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="flex flex-col gap-4 max-w-[600px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#137fec]/30 bg-[#137fec]/10 px-3 py-1 w-fit">
                <span className="material-symbols-outlined text-[14px] text-[#137fec]">auto_graph</span>
                <span className="text-xs font-bold text-[#137fec]">UBP Visualizer</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight text-white">
                Visuals <span className="italic text-[#137fec]">derived</span> from <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">your Unified Blueprint.</span>
              </h2>
              <p className="text-[#9dabb9] text-lg">
                The UBP isn't just a static document—it's a structured engine. Flowro parses your Blueprint to generate professional sequence diagrams and flowcharts automatically.
              </p>
            </div>
          </div>

          {/* Visualizer Demo */}
          <div className="max-w-[1000px] mx-auto bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden relative group w-full flex flex-col md:flex-row">
            {/* Left - Code view */}
            <div className="w-full md:w-[40%] border-r border-[#30363d] bg-[#0d1117] flex flex-col">
              <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-blue-400">description</span>
                  <span className="font-mono text-xs text-[#7d8590]">unified_blueprint.ubp</span>
                </div>
              </div>
              <div className="p-6 font-mono text-xs leading-relaxed text-gray-400 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0d1117] z-10"></div>
                <div className="text-purple-400 mb-2">## Authentication Flow</div>
                <div className="pl-4 border-l border-[#30363d] mb-4">
                  <span className="text-blue-400">Participant:</span> User<br />
                  <span className="text-blue-400">Participant:</span> Client App<br />
                  <span className="text-blue-400">Participant:</span> API Gateway<br />
                  <span className="text-blue-400">Participant:</span> Auth Svc
                </div>
                <div className="text-yellow-400 mb-2"># Logic Steps</div>
                <div className="pl-4 border-l border-[#30363d]">
                  1. User clicks login<br />
                  2. Client POST /auth/login<br />
                  3. Gateway validates token<br />
                  4. <span className="text-green-400">If valid:</span> Create session<br />
                  5. Return 200 OK
                </div>
                <div className="mt-8 text-gray-600 italic">// This structured text generates the visual on the right automatically.</div>
              </div>
            </div>

            {/* Right - Diagram view */}
            <div className="w-full md:w-[60%] bg-[#161b22] relative flex flex-col">
              <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-green-400">preview</span>
                  <span className="font-mono text-xs text-[#7d8590]">Preview: Sequence Diagram</span>
                </div>
                <div className="flex gap-2">
                  <div className="size-2 rounded-full bg-red-500/20"></div>
                  <div className="size-2 rounded-full bg-yellow-500/20"></div>
                  <div className="size-2 rounded-full bg-green-500/20"></div>
                </div>
              </div>
              <div className="p-8 relative min-h-[400px] bg-[#1e2329]">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(#30363d 1px, transparent 1px)',
                  backgroundSize: '24px 24px'
                }}></div>
                <div className="relative z-10 w-full h-full flex justify-between">
                  {/* Diagram participants */}
                  {[
                    { icon: 'person', color: 'text-white', label: 'User' },
                    { icon: 'smartphone', color: 'text-blue-400', label: 'App' },
                    { icon: 'dns', color: 'text-purple-400', label: 'API' },
                    { icon: 'shield', color: 'text-orange-400', label: 'Auth' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center h-full relative w-1/4">
                      <div className="p-2 bg-[#0d1117] border border-[#30363d] rounded mb-4 z-20 shadow-lg">
                        <span className={`material-symbols-outlined ${item.color} text-[18px]`}>{item.icon}</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#7d8590] mb-4">{item.label}</div>
                      <div className="w-px bg-[#30363d] h-[300px] border-l border-dashed border-[#30363d] relative"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 px-6 lg:px-40">
        <div className="max-w-[960px] mx-auto flex flex-col gap-16">
          <div className="flex flex-col items-center text-center gap-4">
            <h2 className="text-3xl font-bold leading-tight tracking-[-0.015em]">How it Works</h2>
            <p className="text-[#9dabb9] text-lg max-w-[600px]">
              Turn your scattered ideas into a production-ready blueprint in 5 automated steps.
            </p>
          </div>
          <div className="flex flex-col pl-4 sm:pl-20 max-w-[800px] mx-auto w-full">
            {/* Step 1 */}
            <div className="flex gap-6 group">
              <div className="flex flex-col items-center">
                <div className="size-14 rounded-full border border-[#30363d] bg-[#161b22] flex items-center justify-center z-10 group-hover:border-[#137fec] transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-white text-[28px]">playlist_add</span>
                </div>
                <div className="w-[2px] h-full bg-[#30363d] -my-2 group-hover:bg-[#137fec]/50 transition-colors"></div>
              </div>
              <div className="pb-16 pt-3">
                <h3 className="text-xl font-bold mb-2">Builder Dumps "Chaos" Idea</h3>
                <p className="text-[#9dabb9] leading-relaxed text-base">Paste raw notes, Loom transcripts, or messy docs. Flowro handles the chaos.</p>
              </div>
            </div>
            {/* Step 2 */}
            <div className="flex gap-6 group">
              <div className="flex flex-col items-center">
                <div className="size-14 rounded-full border border-[#30363d] bg-[#161b22] flex items-center justify-center z-10 group-hover:border-[#137fec] transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-white text-[28px]">psychology</span>
                </div>
                <div className="w-[2px] h-full bg-[#30363d] -my-2 group-hover:bg-[#137fec]/50 transition-colors"></div>
              </div>
              <div className="pb-16 pt-3">
                <h3 className="text-xl font-bold mb-2">Agent Studies Needs & Infers Gaps</h3>
                <p className="text-[#9dabb9] leading-relaxed text-base">AI analyzes context, flags contradictions, and intelligently infers missing logic.</p>
              </div>
            </div>
            {/* Step 3 */}
            <div className="flex gap-6 group">
              <div className="flex flex-col items-center">
                <div className="size-14 rounded-full border border-[#30363d] bg-[#161b22] flex items-center justify-center z-10 group-hover:border-[#137fec] transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-white text-[28px]">architecture</span>
                </div>
                <div className="w-[2px] h-full bg-[#30363d] -my-2 group-hover:bg-[#137fec]/50 transition-colors"></div>
              </div>
              <div className="pb-16 pt-3">
                <h3 className="text-xl font-bold mb-2">Agent Generates Full UBP Draft</h3>
                <p className="text-[#9dabb9] leading-relaxed text-base">Receive a structured Unified Blueprint (UBP) draft instantly, ready for code generation.</p>
              </div>
            </div>
            {/* Step 4 */}
            <div className="flex gap-6 group">
              <div className="flex flex-col items-center">
                <div className="size-14 rounded-full border border-[#30363d] bg-[#161b22] flex items-center justify-center z-10 group-hover:border-[#137fec] transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-white text-[28px]">rate_review</span>
                </div>
                <div className="w-[2px] h-full bg-[#30363d] -my-2 group-hover:bg-[#137fec]/50 transition-colors"></div>
              </div>
              <div className="pb-16 pt-3">
                <h3 className="text-xl font-bold mb-2">Builder Reviews & Refines</h3>
                <p className="text-[#9dabb9] leading-relaxed text-base">Collaborate with the AI to refine specs. It learns from your feedback.</p>
              </div>
            </div>
            {/* Step 5 - Final */}
            <div className="flex gap-6 group">
              <div className="flex flex-col items-center">
                <div className="size-14 rounded-full border border-[#137fec] bg-[#137fec] flex items-center justify-center z-10 shadow-[0_0_20px_rgba(19,127,236,0.4)]">
                  <span className="material-symbols-outlined text-white text-[28px]">lock</span>
                </div>
              </div>
              <div className="pt-3">
                <h3 className="text-xl font-bold text-[#137fec] mb-2">Agent Locks Version & Exports</h3>
                <p className="text-[#9dabb9] leading-relaxed text-base">Version locked. Export your UBP directly to your development pipeline.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 lg:px-40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#137fec]/5 pointer-events-none"></div>
        <div className="max-w-[720px] mx-auto flex flex-col items-center text-center gap-8 relative z-10">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-[#161b22] to-[#0D1117] border border-[#30363d] flex items-center justify-center shadow-xl mb-4">
            <span className="material-symbols-outlined text-[#137fec] text-[40px]">hourglass_bottom</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
            Ready to find your flow?
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[480px]">
            <div className="flex-1 relative group">
              <input
                className="w-full h-12 rounded-lg bg-[#161b22] border border-[#30363d] px-4 text-white placeholder-[#637588] focus:outline-none transition-all cursor-not-allowed opacity-70"
                placeholder="Enter your email"
                type="email"
                disabled
                onClick={() => handleComingSoon("We will open beta try soon!")}
              />
              <div
                className="absolute inset-0 cursor-pointer z-10"
                onClick={() => handleComingSoon("We will open beta try soon!")}
              ></div>
            </div>
            <button
              className="h-12 px-6 rounded-lg bg-[#137fec]/50 text-white font-bold cursor-not-allowed whitespace-nowrap"
              type="button"
              disabled
              onClick={() => handleComingSoon("We will open beta try soon!")}
            >
              Get Access
            </button>
          </div>
          <p className="text-xs text-[#637588]">No credit card required. Beta invites sent weekly.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#30363d] bg-[#0D1117] py-12 px-6 lg:px-40">
        <div className="max-w-[960px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#137fec]">hourglass_top</span>
            <span className="text-white font-bold text-lg">Flowro AI</span>
          </div>
          <div className="flex gap-8 text-sm text-[#9dabb9]"></div>
          <p className="text-xs text-[#637588]">© 2025 Flowro AI Inc. All rights reserved.</p>
        </div>
      </footer>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]">
          <div className="bg-[#161b22] border border-[#137fec]/50 text-white px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]">
            <span className="material-symbols-outlined text-[#137fec]">info</span>
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
    </div>
  );
}
