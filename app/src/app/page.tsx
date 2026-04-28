import Link from "next/link";

const repoUrl = "https://github.com/KhalidD0nc/Flowro-PM";

const jsonLdSoftware = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "Flowro",
  codeRepository: repoUrl,
  programmingLanguage: ["TypeScript", "React"],
  runtimePlatform: "Next.js",
  description:
    "Open-source, self-hosted plan-to-app builder that turns messy ideas into approved plans, generated UI, and local build runs.",
  url: "https://flowro.app",
  license: "https://github.com/KhalidD0nc/Flowro-PM",
};

const pipelineSteps = [
  { label: "Idea", detail: "Paste the messy paragraph before it becomes company policy." },
  { label: "Project Plan", detail: "Flowro turns chaos into an execution contract." },
  { label: "Approve Plan", detail: "A human says yes before agents touch sharp objects." },
  { label: "Design Agent", detail: "Generate screens from the plan, not from vibes." },
  { label: "Approve UI", detail: "Catch weird buttons before they reproduce." },
  { label: "Local Build", detail: "Run the worker where your keys and files live." },
];

const features = [
  {
    icon: "assignment",
    title: "Plan generation",
    copy: "A staged project plan with scope, routes, data shape, acceptance checks, and the boring bits agents usually forget.",
  },
  {
    icon: "draw",
    title: "Product design agent",
    copy: "Turn approved plans into UI artifacts, then review before the code machine starts eating tokens.",
  },
  {
    icon: "terminal",
    title: "Local build worker",
    copy: "Install, build, check, and repair inside your own workspace instead of throwing your project at a mystery cloud.",
  },
  {
    icon: "history",
    title: "Versioned specs",
    copy: "Lock the plan, keep history, and stop asking why the button exists three commits later.",
  },
  {
    icon: "ios_share",
    title: "Agent-ready exports",
    copy: "Blueprints, Markdown, JSON, and diagrams for the tools already open on your second monitor.",
  },
  {
    icon: "vpn_key",
    title: "Bring your keys",
    copy: "OpenRouter, Firebase, Stitch, and whatever else your self-hosted setup needs. Your bill, your blast radius.",
  },
];

export default function Home() {
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

        <div className="relative mx-auto flex max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3" aria-label="Flowro home">
              <img src="/logo.svg" alt="" className="size-9" />
              <span className="text-lg font-black tracking-tight">Flowro</span>
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-bold md:flex">
              <a className="hover:text-[#c2410c]" href="#pipeline">Pipeline</a>
              <a className="hover:text-[#c2410c]" href="#features">Features</a>
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

          <div className="grid min-h-[calc(100vh-84px)] items-center gap-12 py-14 lg:grid-cols-[1.04fr_0.96fr] lg:py-20">
            <div>
              <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border-2 border-[#201815] bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] shadow-[4px_4px_0_#201815]">
                <span className="size-2 rounded-full bg-[#16a34a]" />
                Open-source. Self-hosted. Mildly suspicious of clouds.
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-[#201815] sm:text-6xl lg:text-7xl">
                Turn vibe-coded soup into an app plan agents can actually chew.
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[#5f5045] sm:text-xl">
                Flowro is the open-source plan-to-app builder for people who have watched a
                paragraph prompt become a filesystem incident. Bring your keys, run your stack,
                keep the cloud out of it.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href={repoUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#201815] bg-[#f97316] px-6 py-4 text-base font-black text-[#201815] shadow-[7px_7px_0_#201815] transition-transform hover:-translate-y-1"
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="material-symbols-outlined text-[22px]">code</span>
                  View on GitHub
                </a>
                <a
                  href="#quickstart"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#201815] bg-white px-6 py-4 text-base font-black text-[#201815] shadow-[7px_7px_0_#201815] transition-transform hover:-translate-y-1"
                >
                  <span className="material-symbols-outlined text-[22px]">bolt</span>
                  Self-host quickstart
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-4 top-10 h-20 w-20 rotate-12 rounded-full border-2 border-[#201815] bg-[#ef4444] max-sm:hidden" />
              <div className="relative rounded-[22px] border-2 border-[#201815] bg-[#201815] p-3 shadow-[14px_14px_0_#67d7c1]">
                <div className="rounded-[14px] border border-white/15 bg-[#15110f]">
                  <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
                    <div className="flex gap-2">
                      <span className="size-3 rounded-full bg-[#ef4444]" />
                      <span className="size-3 rounded-full bg-[#ffd75a]" />
                      <span className="size-3 rounded-full bg-[#67d7c1]" />
                    </div>
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#f8f1e5]/60">
                      local-worker.log
                    </span>
                  </div>
                  <div className="space-y-4 p-5 font-mono text-sm leading-7 text-[#f8f1e5] sm:p-7">
                    <p><span className="text-[#67d7c1]">$</span> flowro ingest &quot;make me a SaaS maybe&quot;</p>
                    <p className="text-[#ffd75a]">warning: detected 14 vibes, 0 acceptance criteria</p>
                    <p className="text-[#67d7c1]">✓ generated project plan</p>
                    <p className="text-[#67d7c1]">✓ waiting for human approval</p>
                    <p className="text-[#f97316]">→ design agent produced screens from plan</p>
                    <p className="text-[#67d7c1]">✓ local build worker started</p>
                    <div className="rounded-lg border border-[#67d7c1]/40 bg-[#67d7c1]/10 p-4">
                      <p className="text-[#67d7c1]">result: fewer haunted components</p>
                      <p className="text-[#f8f1e5]/70">cloud_upload: skipped with enthusiasm</p>
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
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c2410c]">From chaos to app</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Six stages, because “just generate it” is how buttons become databases.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pipelineSteps.map((step, index) => (
              <article key={step.label} className="rounded-2xl border-2 border-[#201815] bg-white p-6 shadow-[7px_7px_0_#201815]">
                <div className="mb-8 flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-[#c2410c]">0{index + 1}</span>
                  <span className="material-symbols-outlined text-3xl text-[#201815]">arrow_forward</span>
                </div>
                <h3 className="text-2xl font-black">{step.label}</h3>
                <p className="mt-3 text-base font-medium leading-7 text-[#6b5b4f]">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-[#201815]/15 bg-[#201815] px-5 py-20 text-[#fffaf0] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#67d7c1]">What it does</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                Structure first. Agents second. Regret somewhere else.
              </h2>
            </div>
            <p className="max-w-md text-lg font-medium leading-8 text-[#fffaf0]/70">
              Flowro gives coding agents a contract, not a fortune cookie.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-[#fffaf0]/20 bg-[#fffaf0]/7 p-6">
                <span className="material-symbols-outlined rounded-xl border border-[#fffaf0]/20 bg-[#f97316] p-3 text-3xl text-[#201815]">
                  {feature.icon}
                </span>
                <h3 className="mt-6 text-2xl font-black">{feature.title}</h3>
                <p className="mt-3 text-base font-medium leading-7 text-[#fffaf0]/70">{feature.copy}</p>
              </article>
            ))}
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

# add Firebase, OpenRouter, and Stitch keys
npm run dev`}</code></pre>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[28px] border-2 border-[#201815] bg-[#ffd75a] p-8 shadow-[12px_12px_0_#201815] sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#7c2d12]">
                For builders who broke production with a paragraph prompt
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                Flowro is adult supervision for your coding agents.
              </h2>
              <p className="mt-5 max-w-3xl text-lg font-bold leading-8 text-[#4b362b]">
                Not a hosted magic box. Not another dashboard asking for your credit card.
                It is a repo that helps you slow down just enough to ship faster.
              </p>
            </div>
            <div className="rounded-2xl border-2 border-[#201815] bg-white p-6 shadow-[7px_7px_0_#201815]">
              <p className="font-mono text-sm font-black uppercase tracking-widest text-[#c2410c]">Recommended dosage</p>
              <ul className="mt-5 space-y-4 text-lg font-black">
                <li>1 messy idea</li>
                <li>1 approved plan</li>
                <li>1 local build worker</li>
                <li>0 surprise cloud accounts</li>
              </ul>
            </div>
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
    </main>
  );
}
