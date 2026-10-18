---
name: Academic Learning Ecosystem
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#47464f'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#787680'
  outline-variant: '#c8c5d0'
  surface-tint: '#5b598c'
  primary: '#070235'
  on-primary: '#ffffff'
  primary-container: '#1e1b4b'
  on-primary-container: '#8683ba'
  inverse-primary: '#c4c1fb'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#140900'
  on-tertiary: '#ffffff'
  tertiary-container: '#331d00'
  on-tertiary-container: '#c07a00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c4c1fb'
  on-primary-fixed: '#181445'
  on-primary-fixed-variant: '#444173'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.025em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2rem
  margin: 2rem
  margin-sm: 1rem
  margin-lg: 4rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system projects scholarly rigor combined with the intuitive clarity of modern digital products. It targets academic researchers, university students, and institutional faculty who demand precision, efficiency, and sustained focus during extended reading and administrative tasks.

The visual style blends institutional modernism with refined utilitarian UI patterns:
- **Tone:** Authoritative yet approachable, calm, and intellectually empowering.
- **Visual Rhythm:** Balanced whitespace, structured data presentation, and deliberate content prioritization that prevents cognitive overload.
- **Aesthetic Movement:** Modern corporate edtech layered with crisp architectural framing. Interfaces rely on structured card planes, subtle slate borders, and intentional golden-amber highlights for academic progression and validation states.

## Colors

The palette establishes an intellectual atmosphere anchored in deep, authoritative tones and luminous functional accents:

- **Primary (`#1E1B4B`):** Deep Academic Indigo serves as the cornerstone of the system. Used for key navigational headers, primary buttons, active structural tabs, and prominent brand marks.
- **Secondary (`#0EA5E9`):** Soft Sky Blue provides contextual feedback, link highlights, interactive focus indicators, and ongoing progress metrics.
- **Tertiary (`#F59E0B`):** Warm Amber acts strictly as an accent to indicate honors, milestones, active badges, and achievement credentials without overwhelming functional states.
- **Neutral (`#475569`):** Muted Slate handles high-legibility body prose, secondary labels, and structural dividers.
- **Surfaces & Backgrounds:** Canvas layers transition between pristine white (`#FFFFFF`) for elevated cards and faint slate-tinted mist (`#F8FAFC` to `#F1F5F9`) for primary layout viewports. Structural hairline borders utilize `#E2E8F0`.

## Typography

The typographic pairing balances institutional prestige with clinical readability:

- **Headlines (`Plus Jakarta Sans`):** Clean, geometric neo-grotesque contours convey modern clarity across editorial portals, section headers, and authentication greeting sequences. Tight negative letter-spacing ensures titles remain anchored and cohesive.
- **Body & Functional UI (`Inter`):** Selected for its neutral character shapes, extensive glyph set, and distinct numeral forms essential for course IDs, analytical data, tabular charts, and long-form institutional texts.
- **Contrast & Legibility:** Dark slate `#0F172A` is reserved for all headings to establish commanding visual weight. Body copy defaults to `#475569`, providing comfortable reading contrast against pure white cards without the harshness of pure black. Supporting metadata, captions, and tooltips utilize `#64748B`.

## Layout & Spacing

The layout architecture employs a mathematically disciplined 8-point grid foundation:

- **Desktop (1024px+):** 12-column responsive grid with a 1.5rem (`gutter`) column separation and outer margins of 2rem (`margin`) to 4rem (`margin-lg`). Two-column authentication screens split evenly (50/50) or in a 45/55 distribution, pairing an editorial brand masthead with an interactive credential pane.
- **Tablet (768px - 1023px):** 8-column grid with 1.5rem gutters. Side-by-side authentication layouts compress gracefully; editorial brand panels collapse into a high-density header banner when viewport space requires focus on inputs.
- **Mobile (Below 768px):** 4-column grid with 1rem gutters (`gutter-sm`) and 1rem canvas margins (`margin-sm`). Secondary editorial sidebars drop out entirely, leaving brand marks and essential fields prioritized within a single-column flow.

## Elevation & Depth

Visual hierarchy relies on structural hairline borders combined with soft, indigo-tinted atmospheric diffusion:

- **Flat/Resting (`Elevation 0`):** Pure `#FFFFFF` surfaces inset against the `#F8FAFC` page background, framed by a continuous 1px outline in `#E2E8F0`. No shadow is cast.
- **Card/Container (`Elevation 1`):** Default state for course cards, interactive forms, and auth containers. Defined by a 1px border (`#E2E8F0`) and an ambient shadow: `0px 1px 3px 0px rgba(30, 27, 75, 0.04), 0px 4px 12px 0px rgba(30, 27, 75, 0.03)`.
- **Raised/Dropdowns (`Elevation 2`):** Used for select menus, autocomplete flyouts, and floating contextual toolbars. Layered with `0px 4px 6px -1px rgba(30, 27, 75, 0.06), 0px 10px 15px -3px rgba(30, 27, 75, 0.05)` and framed in `#CBD5E1`.
- **Dialogs/Modals (`Elevation 3`):** High-priority overlays cast a diffused, high-distance shadow: `0px 20px 25px -5px rgba(30, 27, 75, 0.08), 0px 8px 10px -6px rgba(30, 27, 75, 0.04)` over a 40% opacity navy backdrop (`#0F172A66`).

## Shapes

The shape system adopts a roundedness factor of `2`, producing structured, modern interfaces without overly playful or bubbly geometry:

- **Default Form & Button Corner Radii:** Standard inputs, buttons, chips, and small controls use a baseline radius of `0.5rem` (`8px`).
- **Cards & Panes:** Content containers, modal sheets, and authentication cards feature `1rem` (`16px`) corner radiuses (`rounded-lg`), establishing clear structural boundaries.
- **Pill Exceptions:** Restricted strictly to numerical counter tags, status indicators, and notification badges using full pill geometry to communicate non-interactive metadata.

## Components

### Buttons
- **Primary:** Solid `#1E1B4B` background with `#FFFFFF` text. Subtle hover transition to `#312E81`. Focus rings use a 2px offset with `#0EA5E9`.
- **Secondary:** Surface `#FFFFFF` with a 1px border in `#CBD5E1` and `#0F172A` text. Hover state initiates `#F8FAFC` background.
- **Ghost:** Transparent background with `#475569` text, transitioning to `#F1F5F9` on hover.

### Inputs & Text Fields
- Inspired by modern utility-first component libraries: 1px border `#E2E8F0`, surface background `#FFFFFF`, text `#0F172A`, placeholder `#94A3B8`.
- Height: 40px standard with `0.5rem` border radius.
- **Interactive Toggles:** Password visibility toggles utilize right-aligned 16px icons in `#64748B`, transitioning to `#1E1B4B` on hover/focus.
- **Focus State:** 2px ring in `#0EA5E9` with 1px border `#0EA5E9`, eliminating layout shift.

### Checkboxes & Radios
- Checkboxes: 16px square with 4px border radius. Unchecked state: `#CBD5E1` border on `#FFFFFF`. Checked: solid `#1E1B4B` with `#FFFFFF` checkmark vector.
- Radios: 16px circle with identical border logic, containing a centered 6px solid `#1E1B4B` dot when selected.

### Chips & Badges
- **Academic Milestone:** Warm Amber background `#FEF3C7`, border `#FDE68A`, text `#92400E`.
- **Course Status:** Sky Blue background `#E0F2FE`, border `#BAE6FD`, text `#0369A1`.

### Cards & Layout Containers
- Crisp white canvas (`#FFFFFF`) with 1px border (`#E2E8F0`), padding of `1.5rem` (`space-lg`), and Elevation 1 ambient shadow.
- In two-column authentication structures, the left-hand branding panel features deep navy typography, academic imagery, and milestone highlights, while the right-hand container encloses the form within a clear visual hierarchy.