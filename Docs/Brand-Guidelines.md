# Flowro Brand Guidelines

This document outlines the visual identity and brand guidelines for **Flowro AI: Unified Blueprint Engine**. These standards ensure a consistent, premium, and professional user experience across all platforms.

---

## 1. Core Brand Identity
**Flowro AI** is a "Unified Blueprint Engine" designed to transform messy ideas into structured, agent-ready project blueprints. The brand reflects **precision, fluidity, and technological intelligence**.

---

## 2. Color Palette
The brand uses a sleek, dark-themed palette with high-contrast primary accents to evoke a modern, high-tech workspace.

### Core Colors
| Color Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **Primary Blue** | `#137fec` | Brand identity, primary buttons, active states. |
| **Accent Blue**| `#2f81f7` | Hover states, subtle highlights, secondary accents. |
| **Background Dark** | `#0D1117` | Main application background (Dark Mode). |
| **Surface Dark** | `#161b22` | Component surfaces, card backgrounds. |
| **Border Dark** | `#30363d` | Dividers, element borders, inactive states. |
| **Text Secondary**| `#9dabb9` | Captions, non-essential text, placeholders. |
| **Background Light**| `#f6f7f8` | Secondary background for light mode contexts. |

### Gradients
*   **User Message Gradient:** `#137fec` to `#0d5fbc` (135° angle).
*   **Gradient Text:** `#ffffff` → `#9dabb9` → `#137fec` (135° angle).
*   **Glass Gradient:** Semi-transparent blue fade (`rgba(19, 127, 236, 0.05)` to `transparent`).

---

## 3. Typography
We prioritize readability and a "developer-friendly" aesthetic.

### Typefaces
*   **Primary Font:** `Inter` (Sans-serif)
    *   *Usage:* All UI text, body copy, and headings.
*   **Mono Font:** `JetBrains Mono` (Monospace)
    *   *Usage:* Code blocks, technical data, and blueprint exports.
*   **Icons:** `Material Symbols Outlined`
    *   *Usage:* Interface icons, navigation, and status indicators.

---

## 4. Design Principles
### Visual Aesthetics
1.  **Glassmorphism:** Use of blurred, semi-transparent backgrounds (`backdrop-filter: blur(12px)`) for AI messages and overlays to create depth.
2.  **Subtle Micro-interactions:** Buttons should have scale-down effects on click and slight elevations on hover.
3.  **Glow Effects:** Critical priorities and active elements use soft outer glows to draw attention without being overwhelming.
4.  **Grid System:** Backgrounds utilize a subtle 40px grid pattern to emphasize the "Blueprint" nature of the product.

### Animations & Motion
Motion is used to convey life and intelligence within the platform.
*   **Flow Beam:** (`animate-flow-beam`) A light beam that translates across elements, indicating active data processing.
*   **Floating:** (`animate-float`) A gentle vertical translation used for decorative background elements.
*   **Subtle Pulse:** (`animate-subtle-pulse`) A slight scale and opacity change for welcome or highlight icons.
*   **Slide In:** (`animate-slide-in-left` / `animate-slide-in-right`) Used for chat messages to create a natural conversation flow.
*   **Typing Indicator:** (`typing-dot`) Rhythmically bouncing dots to signify AI "thinking" states.

---

## 5. Visual Elements
### Iconography
Icons should be **Outlined** style with a weight of **400** and "fill" enabled where emphasized.

### Components
*   **Chat Bubbles:** AI responses use the `glass-message` style; User responses use the `user-message-gradient`.
*   **Status Badges:**
    *   **Planning:** Soft grey border/shadow.
    *   **In-Progress:** Primary blue border/glow.
    *   **Launched:** Emerald green border/glow.

---

## 6. Logo Assets
*   **Primary Logo:** `logo.png`
*   **Secondary/Parent:** `antigraviti-logo.png` (Antigravity brand)
*   **Asset Location:** `app/public/`

---

*Last Updated: January 2026*
