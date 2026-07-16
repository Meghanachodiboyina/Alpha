# UI/UX Design Guidelines & Taste Rules

This document serves as the mandatory aesthetic and interaction baseline for the Automated Routine Creator. Any agent writing frontend code MUST abide by these principles to avoid the "generic AI look".

## 1. Taste & Aesthetics (The "Taste Skill")
- **Color Palette**: Never use pure or default CSS colors (e.g., `#FF0000` or `blue`). Use tailored, HSL-based palettes with rich, deep tones for dark mode and soft, airy tones for light mode.
- **Glassmorphism**: Utilize backdrop-blur (`backdrop-filter`) and semi-transparent borders for overlays, dashboards, and cards to create depth.
- **Borders & Shadows**: Avoid harsh, solid borders. Use subtle box-shadows (e.g., soft, wide spread with low opacity) to elevate elements.

## 2. Spacing & Typography (The "Impeccable" Rules)
- **The 8px Grid**: All padding, margins, and heights MUST follow a strict 4px/8px incremental grid system (4, 8, 12, 16, 24, 32, 48, 64).
- **Typography Hierarchy**: 
  - Use modern geometric or grotesque sans-serif fonts (e.g., Inter, Outfit, Geist).
  - Enforce clear contrast between `h1`, `h2`, `h3`, and `p`.
  - Body text should never be pure black (`#000`) or pure white (`#FFF`); use off-colors like `slate-800` or `gray-200` to reduce eye strain.
- **Breathing Room**: Default to slightly larger padding on containers to ensure the UI feels open and not cramped.

## 3. Motion & Interaction (The "Emil Kowalski" Rules)
- **No Clunky Transitions**: Do NOT use linear or standard `ease` transitions for state changes.
- **Spring Physics**: All interactive elements (buttons, modals, dropdowns) must use spring-based animations. 
  - *Web (Next.js)*: Use CSS `linear()` easing approximations for springs, or Framer Motion (`type: "spring", stiffness: 300, damping: 20`).
  - *Mobile (Expo)*: Use React Native Reanimated with `withSpring()`.
- **Micro-interactions**: Hovering over interactive elements should scale them slightly (e.g., `scale(0.98)` on active/press, `scale(1.02)` on hover).
- **Reveal Animations**: Page loads should feature subtle stagger-fade-up animations for lists and dashboard items.
