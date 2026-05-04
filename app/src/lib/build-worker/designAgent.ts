import type { BuildContract, ProjectPlan } from "@/lib/project-plan/schema"
import { generateBuildCompletionWithFallback } from "./openrouter-build"

export type DesignArchetype = "editorial" | "saas" | "darkmode" | "playful" | "minimal"

export interface DesignSystemSpec {
    archetype: DesignArchetype
    personality: string
    colorPalette: {
        primary: string
        primaryText: string
        secondary: string
        background: string
        surface: string
        surfaceElevated: string
        ink: string
        inkSecondary: string
        inkMuted: string
        line: string
        lineFaint: string
        accent: string
        accentText: string
        success: string
        warning: string
        danger: string
    }
    typography: {
        headingFont: string
        bodyFont: string
        monoFont: string
        headingWeight: number
        bodyWeight: number
        headingLineHeight: number
        bodyLineHeight: number
        scale: {
            hero: string
            h1: string
            h2: string
            h3: string
            body: string
            small: string
            label: string
        }
    }
    spacing: {
        unit: number
        density: "compact" | "comfortable" | "spacious"
        sectionGap: string
        cardPadding: string
        pagePadding: string
    }
    shadows: {
        card: string
        elevated: string
        glow: string
    }
    borderRadius: {
        card: string
        button: string
        input: string
        pill: string
    }
    animation: {
        entrance: string
        hover: string
        stagger: number
        prefersReducedMotion: boolean
    }
    iconSet: "lucide" | "emoji" | "custom"
    layout: {
        maxWidth: string
        sidebarWidth: string
        topbarHeight: string
        gridColumns: number
    }
    moodKeywords: string[]
}

const DESIGN_AGENT_MODEL = process.env.OPENROUTER_MODEL_DESIGN || "moonshotai/kimi-k2.6"

export async function generateDesignSystem(
    projectPlan: ProjectPlan,
    buildContract: BuildContract,
    archetype: DesignArchetype,
    signal?: AbortSignal,
): Promise<DesignSystemSpec> {
    const prompt = buildDesignAgentPrompt(projectPlan, buildContract, archetype)

    const { content: response } = await generateBuildCompletionWithFallback({
        messages: [{ role: "user", content: prompt }],
        maxTokens: 8000,
        timeoutMs: 60000,
        maxRetries: 1,
        signal,
    })

    try {
        const parsed = extractDesignSystemJson(response)
        return normalizeDesignSystem(parsed, archetype)
    } catch {
        return getDeterministicDesignSystem(archetype)
    }
}

function buildDesignAgentPrompt(
    projectPlan: ProjectPlan,
    buildContract: BuildContract,
    archetype: DesignArchetype,
): string {
    return `You are Flowro's Design Agent. Your job is to create a precise, implementable design system specification for a generated web application.

You are given:
- An approved ProjectPlan (product name, target user, problem, routes)
- A BuildContract (visual direction, component rules)
- A selected Design Archetype (the visual personality)

Return ONLY a JSON object. No markdown, no explanations.

The JSON must follow this exact schema:

{
  "archetype": "${archetype}",
  "personality": "One-sentence design personality description",
  "colorPalette": {
    "primary": "hsl(213 100% 59%)",
    "primaryText": "#ffffff",
    "secondary": "hsl(214 32% 91%)",
    "background": "hsl(0 0% 100%)",
    "surface": "hsl(0 0% 100%)",
    "surfaceElevated": "hsl(0 0% 100%)",
    "ink": "hsl(222 47% 11%)",
    "inkSecondary": "hsl(215 16% 30%)",
    "inkMuted": "hsl(215 16% 47%)",
    "line": "hsl(220 13% 91%)",
    "lineFaint": "hsl(220 13% 96%)",
    "accent": "hsl(213 100% 95%)",
    "accentText": "hsl(213 100% 40%)",
    "success": "hsl(142 76% 36%)",
    "warning": "hsl(38 92% 50%)",
    "danger": "hsl(0 84% 60%)"
  },
  "typography": {
    "headingFont": "Inter, sans-serif",
    "bodyFont": "Inter, sans-serif",
    "monoFont": "ui-monospace, monospace",
    "headingWeight": 600,
    "bodyWeight": 400,
    "headingLineHeight": 1.2,
    "bodyLineHeight": 1.6,
    "scale": {
      "hero": "4rem",
      "h1": "2.25rem",
      "h2": "1.75rem",
      "h3": "1.25rem",
      "body": "1rem",
      "small": "0.875rem",
      "label": "0.75rem"
    }
  },
  "spacing": {
    "unit": 4,
    "density": "comfortable",
    "sectionGap": "4rem",
    "cardPadding": "1.5rem",
    "pagePadding": "1.5rem"
  },
  "shadows": {
    "card": "0 1px 3px rgba(0,0,0,0.07)",
    "elevated": "0 20px 40px -10px rgba(0,0,0,0.12)",
    "glow": "0 0 20px rgba(59,130,246,0.25)"
  },
  "borderRadius": {
    "card": "1rem",
    "button": "0.625rem",
    "input": "0.5rem",
    "pill": "9999px"
  },
  "animation": {
    "entrance": "fade-in-up 0.5s ease-out",
    "hover": "0.15s ease",
    "stagger": 0.05,
    "prefersReducedMotion": true
  },
  "iconSet": "lucide",
  "layout": {
    "maxWidth": "1280px",
    "sidebarWidth": "256px",
    "topbarHeight": "64px",
    "gridColumns": 12
  },
  "moodKeywords": ["modern", "clean", "professional"]
}

Archetype-specific guidance:
- editorial: warm stone tones, serif headings, generous whitespace, refined
- saas: blue/slate tones, sans-serif, dense but readable, high contrast
- darkmode: deep zinc surfaces, violet/neon accents, monospace code touches
- playful: vibrant purple/violet, rounded corners (1rem+), friendly Nunito feel
- minimal: grayscale, thin borders, Swiss spacing, no decorative gradients

Rules:
- ALL color values MUST be valid HSL() or hex color strings.
- Typography scale MUST use rem units.
- Density MUST be one of: compact, comfortable, spacious.
- The design system MUST feel cohesive with the product name and target user.
- Do not use generic defaults — tailor to the product's personality.

Product Name: ${projectPlan.metadata.productName}
Target User: ${projectPlan.targetUser}
Problem: ${projectPlan.problem}
App Summary: ${projectPlan.appSummary}
Visual Direction: ${buildContract.visualDirection}
Selected Archetype: ${archetype}

Generate the design system JSON now.`
}

function extractDesignSystemJson(response: string): Partial<DesignSystemSpec> {
    const trimmed = response.trim()
    if (trimmed.startsWith("{")) {
        try {
            return JSON.parse(trimmed)
        } catch {
            // fall through
        }
    }
    const codeBlockMatch = trimmed.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/)
    if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1].trim())
    }
    const firstBrace = trimmed.indexOf("{")
    const lastBrace = trimmed.lastIndexOf("}")
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
    }
    throw new Error("Could not extract design system JSON")
}

function normalizeDesignSystem(
    parsed: Partial<DesignSystemSpec>,
    archetype: DesignArchetype,
): DesignSystemSpec {
    const deterministic = getDeterministicDesignSystem(archetype)

    return {
        archetype,
        personality: parsed.personality ?? deterministic.personality,
        colorPalette: { ...deterministic.colorPalette, ...parsed.colorPalette },
        typography: {
            ...deterministic.typography,
            ...parsed.typography,
            scale: { ...deterministic.typography.scale, ...parsed.typography?.scale },
        },
        spacing: { ...deterministic.spacing, ...parsed.spacing },
        shadows: { ...deterministic.shadows, ...parsed.shadows },
        borderRadius: { ...deterministic.borderRadius, ...parsed.borderRadius },
        animation: { ...deterministic.animation, ...parsed.animation },
        iconSet: parsed.iconSet ?? deterministic.iconSet,
        layout: { ...deterministic.layout, ...parsed.layout },
        moodKeywords: parsed.moodKeywords ?? deterministic.moodKeywords,
    }
}

export function getDeterministicDesignSystem(archetype: DesignArchetype): DesignSystemSpec {
    const base: DesignSystemSpec = {
        archetype,
        personality: "Clean, modern, and professional.",
        colorPalette: {
            primary: "hsl(213 100% 59%)",
            primaryText: "#ffffff",
            secondary: "hsl(214 32% 91%)",
            background: "hsl(0 0% 100%)",
            surface: "hsl(0 0% 100%)",
            surfaceElevated: "hsl(0 0% 100%)",
            ink: "hsl(222 47% 11%)",
            inkSecondary: "hsl(215 16% 30%)",
            inkMuted: "hsl(215 16% 47%)",
            line: "hsl(220 13% 91%)",
            lineFaint: "hsl(220 13% 96%)",
            accent: "hsl(213 100% 95%)",
            accentText: "hsl(213 100% 40%)",
            success: "hsl(142 76% 36%)",
            warning: "hsl(38 92% 50%)",
            danger: "hsl(0 84% 60%)",
        },
        typography: {
            headingFont: "Inter, sans-serif",
            bodyFont: "Inter, sans-serif",
            monoFont: "ui-monospace, monospace",
            headingWeight: 600,
            bodyWeight: 400,
            headingLineHeight: 1.2,
            bodyLineHeight: 1.6,
            scale: {
                hero: "3.5rem",
                h1: "2rem",
                h2: "1.5rem",
                h3: "1.125rem",
                body: "1rem",
                small: "0.875rem",
                label: "0.75rem",
            },
        },
        spacing: {
            unit: 4,
            density: "comfortable",
            sectionGap: "4rem",
            cardPadding: "1.5rem",
            pagePadding: "1.5rem",
        },
        shadows: {
            card: "0 1px 3px rgba(0,0,0,0.07)",
            elevated: "0 20px 40px -10px rgba(0,0,0,0.12)",
            glow: "0 0 20px rgba(59,130,246,0.25)",
        },
        borderRadius: {
            card: "1rem",
            button: "0.625rem",
            input: "0.5rem",
            pill: "9999px",
        },
        animation: {
            entrance: "fade-in-up 0.5s ease-out",
            hover: "0.15s ease",
            stagger: 0.05,
            prefersReducedMotion: true,
        },
        iconSet: "lucide",
        layout: {
            maxWidth: "1280px",
            sidebarWidth: "256px",
            topbarHeight: "64px",
            gridColumns: 12,
        },
        moodKeywords: ["modern", "clean", "professional"],
    }

    const overrides: Record<DesignArchetype, Partial<DesignSystemSpec>> = {
        editorial: {
            personality: "Warm, refined, and print-inspired with editorial grace.",
            colorPalette: {
                primary: "hsl(24 80% 45%)",
                primaryText: "#faf8f5",
                secondary: "hsl(30 15% 90%)",
                background: "hsl(40 30% 97%)",
                surface: "hsl(40 30% 99%)",
                surfaceElevated: "hsl(40 30% 100%)",
                ink: "hsl(24 10% 10%)",
                inkSecondary: "hsl(24 8% 30%)",
                inkMuted: "hsl(24 6% 50%)",
                line: "hsl(30 15% 88%)",
                lineFaint: "hsl(30 15% 94%)",
                accent: "hsl(30 40% 92%)",
                accentText: "hsl(24 70% 35%)",
                success: "hsl(145 50% 35%)",
                warning: "hsl(38 80% 48%)",
                danger: "hsl(0 55% 50%)",
            },
            typography: {
                headingFont: "'Playfair Display', Georgia, serif",
                bodyFont: "Inter, sans-serif",
                monoFont: "ui-monospace, monospace",
                headingWeight: 700,
                bodyWeight: 400,
                headingLineHeight: 1.15,
                bodyLineHeight: 1.65,
                scale: { hero: "4.5rem", h1: "2.5rem", h2: "1.875rem", h3: "1.375rem", body: "1rem", small: "0.875rem", label: "0.75rem" },
            },
            spacing: { unit: 4, density: "spacious", sectionGap: "6rem", cardPadding: "2rem", pagePadding: "2rem" },
            borderRadius: { card: "0.75rem", button: "0.5rem", input: "0.375rem", pill: "9999px" },
            moodKeywords: ["editorial", "refined", "warm", "premium"],
        },
        saas: {
            personality: "Clean, modern, and highly usable with crisp contrast.",
            colorPalette: {
                primary: "hsl(213 100% 59%)",
                primaryText: "#ffffff",
                secondary: "hsl(214 32% 91%)",
                background: "hsl(0 0% 100%)",
                surface: "hsl(0 0% 100%)",
                surfaceElevated: "hsl(0 0% 100%)",
                ink: "hsl(222 47% 11%)",
                inkSecondary: "hsl(215 16% 30%)",
                inkMuted: "hsl(215 16% 47%)",
                line: "hsl(220 13% 91%)",
                lineFaint: "hsl(220 13% 96%)",
                accent: "hsl(213 100% 95%)",
                accentText: "hsl(213 100% 40%)",
                success: "hsl(142 76% 36%)",
                warning: "hsl(38 92% 50%)",
                danger: "hsl(0 84% 60%)",
            },
            typography: {
                headingFont: "Inter, sans-serif",
                bodyFont: "Inter, sans-serif",
                monoFont: "ui-monospace, monospace",
                headingWeight: 600,
                bodyWeight: 400,
                headingLineHeight: 1.2,
                bodyLineHeight: 1.5,
                scale: { hero: "3rem", h1: "2rem", h2: "1.5rem", h3: "1.125rem", body: "0.9375rem", small: "0.875rem", label: "0.75rem" },
            },
            spacing: { unit: 4, density: "comfortable", sectionGap: "3rem", cardPadding: "1.25rem", pagePadding: "1.5rem" },
            moodKeywords: ["modern", "clean", "professional", "crisp"],
        },
        darkmode: {
            personality: "Deep, immersive, and high-tech with electric accents.",
            colorPalette: {
                primary: "hsl(250 95% 65%)",
                primaryText: "#ffffff",
                secondary: "hsl(240 6% 16%)",
                background: "hsl(240 10% 6%)",
                surface: "hsl(240 10% 9%)",
                surfaceElevated: "hsl(240 10% 12%)",
                ink: "hsl(0 0% 95%)",
                inkSecondary: "hsl(240 5% 75%)",
                inkMuted: "hsl(240 5% 55%)",
                line: "hsl(240 6% 16%)",
                lineFaint: "hsl(240 6% 10%)",
                accent: "hsl(250 30% 18%)",
                accentText: "hsl(250 95% 75%)",
                success: "hsl(145 70% 45%)",
                warning: "hsl(45 90% 55%)",
                danger: "hsl(0 70% 55%)",
            },
            typography: {
                headingFont: "Inter, sans-serif",
                bodyFont: "Inter, sans-serif",
                monoFont: "'JetBrains Mono', ui-monospace, monospace",
                headingWeight: 600,
                bodyWeight: 400,
                headingLineHeight: 1.2,
                bodyLineHeight: 1.6,
                scale: { hero: "3.5rem", h1: "2.25rem", h2: "1.75rem", h3: "1.25rem", body: "1rem", small: "0.875rem", label: "0.75rem" },
            },
            spacing: { unit: 4, density: "comfortable", sectionGap: "4rem", cardPadding: "1.5rem", pagePadding: "1.5rem" },
            shadows: {
                card: "0 1px 3px rgba(0,0,0,0.3)",
                elevated: "0 20px 40px -10px rgba(0,0,0,0.5)",
                glow: "0 0 30px rgba(139,92,246,0.35)",
            },
            borderRadius: { card: "0.75rem", button: "0.5rem", input: "0.375rem", pill: "9999px" },
            moodKeywords: ["immersive", "high-tech", "neon", "dark"],
        },
        playful: {
            personality: "Vibrant, friendly, and energetic with rounded warmth.",
            colorPalette: {
                primary: "hsl(260 80% 55%)",
                primaryText: "#ffffff",
                secondary: "hsl(260 20% 90%)",
                background: "hsl(260 30% 98%)",
                surface: "hsl(0 0% 100%)",
                surfaceElevated: "hsl(0 0% 100%)",
                ink: "hsl(260 30% 18%)",
                inkSecondary: "hsl(260 20% 35%)",
                inkMuted: "hsl(260 15% 55%)",
                line: "hsl(260 20% 90%)",
                lineFaint: "hsl(260 20% 96%)",
                accent: "hsl(260 70% 94%)",
                accentText: "hsl(260 80% 40%)",
                success: "hsl(155 70% 40%)",
                warning: "hsl(35 90% 55%)",
                danger: "hsl(350 75% 55%)",
            },
            typography: {
                headingFont: "'Nunito', Inter, sans-serif",
                bodyFont: "'Nunito', Inter, sans-serif",
                monoFont: "ui-monospace, monospace",
                headingWeight: 800,
                bodyWeight: 400,
                headingLineHeight: 1.15,
                bodyLineHeight: 1.6,
                scale: { hero: "3.5rem", h1: "2.25rem", h2: "1.75rem", h3: "1.25rem", body: "1rem", small: "0.875rem", label: "0.75rem" },
            },
            spacing: { unit: 4, density: "spacious", sectionGap: "4rem", cardPadding: "1.75rem", pagePadding: "1.5rem" },
            borderRadius: { card: "1.25rem", button: "1rem", input: "0.75rem", pill: "9999px" },
            moodKeywords: ["friendly", "vibrant", "rounded", "energetic"],
        },
        minimal: {
            personality: "Swiss-inspired, neutral, and spacious with intentional restraint.",
            colorPalette: {
                primary: "hsl(0 0% 10%)",
                primaryText: "#ffffff",
                secondary: "hsl(0 0% 95%)",
                background: "hsl(0 0% 100%)",
                surface: "hsl(0 0% 100%)",
                surfaceElevated: "hsl(0 0% 100%)",
                ink: "hsl(0 0% 10%)",
                inkSecondary: "hsl(0 0% 30%)",
                inkMuted: "hsl(0 0% 55%)",
                line: "hsl(0 0% 90%)",
                lineFaint: "hsl(0 0% 96%)",
                accent: "hsl(0 0% 95%)",
                accentText: "hsl(0 0% 25%)",
                success: "hsl(0 0% 25%)",
                warning: "hsl(0 0% 35%)",
                danger: "hsl(0 0% 35%)",
            },
            typography: {
                headingFont: "Inter, sans-serif",
                bodyFont: "Inter, sans-serif",
                monoFont: "ui-monospace, monospace",
                headingWeight: 500,
                bodyWeight: 400,
                headingLineHeight: 1.1,
                bodyLineHeight: 1.7,
                scale: { hero: "4rem", h1: "2.5rem", h2: "1.875rem", h3: "1.25rem", body: "1rem", small: "0.875rem", label: "0.6875rem" },
            },
            spacing: { unit: 4, density: "spacious", sectionGap: "6rem", cardPadding: "2rem", pagePadding: "2rem" },
            shadows: { card: "none", elevated: "none", glow: "none" },
            borderRadius: { card: "0.25rem", button: "0.125rem", input: "0.125rem", pill: "9999px" },
            moodKeywords: ["minimal", "swiss", "restrained", "elegant"],
        },
    }

    const override = overrides[archetype]
    return {
        ...base,
        ...override,
        colorPalette: { ...base.colorPalette, ...override.colorPalette },
        typography: { ...base.typography, ...override.typography, scale: { ...base.typography.scale, ...override.typography?.scale } },
        spacing: { ...base.spacing, ...override.spacing },
        shadows: { ...base.shadows, ...override.shadows },
        borderRadius: { ...base.borderRadius, ...override.borderRadius },
        animation: { ...base.animation, ...override.animation },
        layout: { ...base.layout, ...override.layout },
    }
}
