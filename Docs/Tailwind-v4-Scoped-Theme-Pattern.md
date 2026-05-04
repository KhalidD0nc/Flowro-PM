# Tailwind v4 — Scoped Theme Pattern for Embedded Apps

> **Status:** Solved · **Applies to:** Any example/embedded app mounted inside the main Flowro Next.js shell  
> **First encountered:** Nabd example (`/examples/nabd`) · **Date:** May 2026

---

## The Problem

When a generated/example app is embedded as a Next.js route inside the main Flowro shell, it imports its own CSS file with design tokens (colors, fonts, shadows, etc.). In **Tailwind v4**, design tokens are declared with the `@theme` directive:

```css
/* ❌ THIS DOES NOT WORK in a shared Next.js app */
@theme {
  --color-cta: hsl(16 75% 48%);   /* orange */
  --color-accent: hsl(16 85% 95%);
  --color-background: hsl(35 25% 97%);
  ...
}
```

### Why It Fails

`@theme` in Tailwind v4 is a **compile-time, global directive**. It generates CSS custom properties on `:root` — the document root — meaning it affects the **entire page**, not just the component or route that imported the CSS file.

The main Flowro app's `globals.css` also has its own `@theme inline` block that defines:

```css
/* globals.css — main app tokens */
@theme inline {
  --color-accent: oklch(0.94 0.05 248);   /* Flowro blue */
  --color-background: oklch(0.964 0.013 76);
  --color-cta: ...;  /* not set, falls through to undefined */
}
```

Because Next.js bundles and processes **all CSS files together**, the `@theme` blocks from both files land on `:root`. Whichever is declared **last in the bundle wins** — and the main app's tokens consistently override the example app's tokens.

### Symptoms

- Buttons that should be orange (`bg-cta`) render with no background or the wrong color
- Text that should be `text-cta` (orange) renders dark/black  
- Accent backgrounds (`bg-accent`) show the Flowro blue tint instead of the warm cream
- The CTA banner section (`bg-cta`) is completely invisible or wrong color
- Dashboard active sidebar item shows blue highlight instead of orange

---

## The Solution — Scoped CSS Custom Properties

Instead of using `@theme` (global), define all design tokens as **regular CSS custom properties scoped to a wrapper class**. Then override every Tailwind utility that uses those tokens.

### Step 1 — Add a wrapper class to the layout

```tsx
// app/examples/[name]/layout.tsx
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="ar" className="myapp-root antialiased">
      {children}
    </div>
  );
}
```

### Step 2 — Define tokens on the wrapper class, NOT on `:root`

```css
/* myapp.css — ✅ CORRECT APPROACH */
.myapp-root {
  --color-background:       hsl(35 25% 97%);
  --color-surface-base:     hsl(0 0% 100%);
  --color-surface-elevated: hsl(0 0% 100%);
  --color-ink:              hsl(20 30% 15%);
  --color-ink-secondary:    hsl(25 20% 40%);
  --color-ink-muted:        hsl(25 15% 60%);
  --color-line:             hsl(30 20% 88%);
  --color-line-faint:       hsl(30 20% 94%);
  --color-accent:           hsl(16 85% 95%);
  --color-accent-text:      hsl(16 75% 40%);
  --color-success:          hsl(150 60% 38%);
  --color-warning:          hsl(40 90% 50%);
  --color-danger:           hsl(0 75% 55%);
  --color-cta:              hsl(16 75% 48%);
  --color-secondary:        hsl(30 30% 92%);

  /* Apply base styles */
  background-color: var(--color-background);
  color: var(--color-ink);
  font-family: var(--font-myapp-sans);
}
```

### Step 3 — Explicitly override Tailwind utility classes within the scope

Tailwind generates utility classes like `bg-cta`, `text-ink`, `border-line` that read from the CSS custom properties — but since those vars are now only defined on `.myapp-root` and not on `:root`, you need to explicitly override each utility inside the scope:

```css
/* Background overrides */
.myapp-root .bg-background      { background-color: var(--color-background) !important; }
.myapp-root .bg-surface-base    { background-color: var(--color-surface-base) !important; }
.myapp-root .bg-cta             { background-color: var(--color-cta) !important; }
.myapp-root .bg-accent          { background-color: var(--color-accent) !important; }
.myapp-root .bg-line-faint      { background-color: var(--color-line-faint) !important; }
.myapp-root .bg-secondary       { background-color: var(--color-secondary) !important; }
.myapp-root .bg-success         { background-color: var(--color-success) !important; }

/* Opacity variants */
.myapp-root .bg-success\/10     { background-color: hsl(150 60% 38% / 0.1) !important; }
.myapp-root .bg-cta\/10         { background-color: hsl(16 75% 48% / 0.1) !important; }
.myapp-root .bg-surface-base\/80 { background-color: hsl(0 0% 100% / 0.8) !important; }

/* Text overrides */
.myapp-root .text-ink           { color: var(--color-ink) !important; }
.myapp-root .text-ink-secondary { color: var(--color-ink-secondary) !important; }
.myapp-root .text-ink-muted     { color: var(--color-ink-muted) !important; }
.myapp-root .text-cta           { color: var(--color-cta) !important; }
.myapp-root .text-success       { color: var(--color-success) !important; }

/* Border overrides */
.myapp-root .border-line        { border-color: var(--color-line) !important; }
.myapp-root .border-success     { border-color: var(--color-success) !important; }
.myapp-root .border-cta         { border-color: var(--color-cta) !important; }

/* Shadow overrides */
.myapp-root .shadow-card        { box-shadow: var(--shadow-card) !important; }
.myapp-root .shadow-elevated    { box-shadow: var(--shadow-elevated) !important; }
.myapp-root .shadow-glow        { box-shadow: var(--shadow-glow) !important; }

/* Radius overrides */
.myapp-root .rounded-card       { border-radius: var(--radius-card) !important; }
.myapp-root .rounded-button     { border-radius: var(--radius-button) !important; }

/* Font overrides */
.myapp-root .font-sans          { font-family: var(--font-myapp-sans) !important; }
.myapp-root .font-serif         { font-family: var(--font-myapp-serif) !important; }
```

### Step 4 — Use custom font-family variable names

Since the main app may override `--font-sans` via `@theme inline`, use a **unique variable name** for the embedded app's fonts:

```css
/* ✅ Use a namespaced variable, not --font-sans */
.myapp-root {
  --font-myapp-sans:  'Thmanyah Sans', Cairo, sans-serif;
  --font-myapp-serif: 'Thmanyah Serif Display', Tajawal, serif;
}

.myapp-root .font-sans  { font-family: var(--font-myapp-sans) !important; }
.myapp-root .font-serif { font-family: var(--font-myapp-serif) !important; }
```

---

## File Structure Pattern

```
src/
├── app/
│   └── examples/
│       └── [app-name]/
│           ├── layout.tsx        ← add className="[app-name]-root"
│           ├── [app-name].css    ← scoped tokens + utility overrides
│           └── page.tsx
├── components/
│   └── examples/
│       └── [app-name]/
│           └── app-kit.tsx       ← shared UI components
└── lib/
    └── examples/
        └── [app-name]/
            └── mock-data.ts
```

---

## Checklist for Every New Embedded App

- [ ] Create a unique root class: `.{appname}-root`  
- [ ] Add that class to the layout wrapper div  
- [ ] Define **all** design tokens as CSS custom properties on `.{appname}-root` (NOT `@theme` or `:root`)  
- [ ] Add explicit utility overrides for every Tailwind class used: `bg-*`, `text-*`, `border-*`, `shadow-*`, `rounded-*`, `font-*`  
- [ ] Cover **opacity variants** you use: `bg-cta/10`, `bg-surface-base/80`, etc.  
- [ ] Use **namespaced font variables** like `--font-{appname}-sans` to avoid collisions with the main app's `--font-sans`  
- [ ] Copy any custom font files to `public/fonts/` and declare them with `@font-face`  
- [ ] **Never use `@theme`** in an embedded app's CSS file  

---

## Why Not Just Use CSS Modules or Shadow DOM?

| Approach | Problem |
|---|---|
| CSS Modules | Tailwind utility classes (like `bg-cta`) are global and bypass CSS module scoping |
| Shadow DOM | Next.js server components and React hydration don't support Shadow DOM |
| `@theme` scoping | Tailwind v4's `@theme` doesn't support selector-based scoping — it's always global |
| **✅ Wrapper class + `!important`** | Works with Tailwind's JIT, SSR, and React hydration without any build changes |

---

## Reference Implementation

See the working implementation in the Nabd example:
- **Layout:** `src/app/examples/nabd/layout.tsx`
- **Scoped CSS:** `src/app/examples/nabd/nabd.css`
- **Components:** `src/components/examples/nabd/app-kit.tsx`
