/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "hsl(var(--surface))",
          elevated: "hsl(var(--surface-elevated))",
          overlay: "hsl(var(--surface-overlay))",
        },
        ink: {
          DEFAULT: "hsl(var(--ink))",
          secondary: "hsl(var(--ink-secondary))",
          muted: "hsl(var(--ink-muted))",
        },
        line: {
          DEFAULT: "hsl(var(--line))",
          faint: "hsl(var(--line-faint))",
          loud: "hsl(var(--line-loud))",
        },
        cta: {
          DEFAULT: "hsl(var(--cta))",
          hover: "hsl(var(--cta-hover))",
          text: "hsl(var(--cta-text))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          soft: "hsl(var(--accent-soft))",
          text: "hsl(var(--accent-text))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          soft: "hsl(var(--success-soft))",
          text: "hsl(var(--success-text))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          soft: "hsl(var(--warning-soft))",
          text: "hsl(var(--warning-text))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          soft: "hsl(var(--danger-soft))",
          text: "hsl(var(--danger-text))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "Cambria", "Times New Roman", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
        34: "8.5rem",
        88: "22rem",
        128: "32rem",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
        pill: "9999px",
      },
      boxShadow: {
        "card": "0 1px 3px hsl(var(--shadow-color) / 0.07), 0 1px 2px hsl(var(--shadow-color) / 0.06)",
        "card-hover": "0 10px 25px -5px hsl(var(--shadow-color) / 0.08), 0 8px 10px -6px hsl(var(--shadow-color) / 0.06)",
        "elevated": "0 20px 40px -10px hsl(var(--shadow-color) / 0.12)",
        "glow": "0 0 20px hsl(var(--cta) / 0.25)",
        "inner-glow": "inset 0 1px 4px hsl(var(--shadow-color) / 0.04)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out forwards",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "fade-in-scale": "fade-in-scale 0.4s ease-out forwards",
        "slide-in-right": "slide-in-right 0.4s ease-out forwards",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      transitionTimingFunction: {
        "bounce-out": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
}
