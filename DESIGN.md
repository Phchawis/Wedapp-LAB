---
name: TUH Lab QMS
description: ระบบทะเบียนและควบคุมเอกสารคุณภาพห้องปฏิบัติการ — โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
colors:
  institutional-indigo: "#343E9B"
  indigo-deep: "#262E73"
  indigo-ink: "#1B2152"
  indigo-tint: "#F1F2FC"
  seal-coral: "#EC6647"
  coral-deep: "#C2422A"
  coral-tint: "#FDF0EC"
  sky-info: "#2374AE"
  sky-tint: "#DEEDF7"
  ink: "#181B2A"
  slate-secondary: "#54596F"
  slate-tertiary: "#70758C"
  border-default: "#C4C8D6"
  border-subtle: "#E0E2EC"
  surface-page: "#F6F7FB"
  surface-card: "#FFFFFF"
  status-effective: "#1B7A36"
  status-review: "#9A6800"
  status-controlled: "#5B3FA6"
  danger: "#C42330"
typography:
  display:
    fontFamily: "Anuphan, Sarabun, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Anuphan, Sarabun, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.4
  title:
    fontFamily: "Anuphan, Sarabun, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Sarabun, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Sarabun, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  code:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  xs: "3px"
  sm: "5px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.institutional-indigo}"
    textColor: "{colors.surface-card}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "38px"
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.institutional-indigo}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "38px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface-card}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "38px"
  input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  select:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 36px 0 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.md}"
    padding: "24px"
  tab-active:
    backgroundColor: "transparent"
    textColor: "{colors.institutional-indigo}"
    typography: "{typography.body}"
    padding: "10px 14px"
---

# Design System: TUH Lab QMS

## 1. Overview

**Creative North Star: "The Controlled Register" (ทะเบียนควบคุม)**

This is the interface of a controlled document register, not a marketing surface. Every screen behaves like a well-kept ISO 15189 logbook: precise, legible, and traceable — each document carries a control number, a status, a revision count, and a visible history. The design is built so a medical technologist can grab the correct, current version of a quality document in seconds, between tasks, sometimes on a lab tablet. The interface earns trust by getting out of the way; the tool disappears into the task (เครื่องมือต้องหายไปกับงาน).

The personality is **institutional, trustworthy, modern-professional** (ทางการ · น่าเชื่อถือ · ทันสมัยแบบมืออาชีพ). Identity comes from the hospital seal: an Institutional Indigo ring carries brand and primary action, a Seal Coral warms it for rare emphasis. Density is moderate — tables and forms are information-dense where the work demands it, but always with clear hierarchy and generous breathing room around decision points. Surfaces are soft and lightly dimensional (นุ่ม มีมิติเล็กน้อย): white cards lift off a cool slate page on quiet shadows, never flat-and-cold, never heavy.

This system explicitly **rejects four things** (from PRODUCT.md's anti-references): the look of an old government web system (dated tables, raw system fonts, muddy color); anything toy-like or unserious that undercuts the authority of official documents; cluttered screens that dump every field into one view without hierarchy; and flashy marketing-SaaS tropes (loud gradients, hero-metric cards, ad-like exuberance).

**Key Characteristics:**
- Indigo-and-coral identity drawn directly from the hospital laboratory seal.
- Document-control vocabulary (status, revision, owner, history) is always visible and consistent.
- Fixed type scale, Thai-first fonts (Anuphan + Sarabun), mono for codes.
- Cool slate neutrals; white cards on a slate page with soft, functional shadows.
- High contrast and tablet-ready by default — legibility is non-negotiable.

## 2. Colors

A cool, institutional palette anchored by the seal's indigo ring and coral centre, set against blue-slate neutrals so the brand reads as clinical and trustworthy rather than corporate-cold.

### Primary
- **Institutional Indigo** (#343E9B): The brand and primary-action color — primary buttons, active tab/nav state, focus rings, the document-type code for Quality Manuals, and any "this is the system speaking" moment. Taken from the seal's outer ring.
- **Indigo Deep** (#262E73): The "institutional" button weight and darker structural accents (header underlines, emphasis on dark surfaces). Hover/pressed depth for indigo elements is produced by a brightness shift, not a separate token.
- **Indigo Ink** (#1B2152): The darkest brand step, for high-emphasis text on tinted brand surfaces and gradient ends.
- **Indigo Tint** (#F1F2FC): A near-white indigo wash for selected rows, soft brand panels, and active-count chips.

### Secondary
- **Seal Coral** (#EC6647): The warm accent from the seal's centre. Used sparingly for genuine emphasis and warmth — never as a default action color, never decoration. Its rarity is the point.
- **Coral Deep** (#C2422A): The readable coral for text/icons on light backgrounds and the deep end of accent gradients.

### Tertiary
- **Sky Info** (#2374AE): Informational and link-adjacent moments, plus the "approved" document state and certain document-type codes. A calm, non-alarming blue distinct from the indigo brand.

### Neutral
- **Ink** (#181B2A): Primary body and heading text. The default reading color; legibility first.
- **Slate Secondary** (#54596F): Secondary text, labels, supporting copy. Passes AA on white.
- **Slate Tertiary** (#70758C): Captions and de-emphasized metadata on white only. Never body text, never on a tinted surface.
- **Border Default** (#C4C8D6) / **Border Subtle** (#E0E2EC): Form-control strokes and card/divider lines respectively.
- **Surface Page** (#F6F7FB): The app background — a cool slate so white cards read as lifted.
- **Surface Card** (#FFFFFF): The content surface for cards, tables, and panels.

### Document-Control Status (semantic, fixed by the QMS workflow)
- **Effective / ประกาศใช้** (#1B7A36 on #DCF0E2): the current, usable version.
- **Review / รอทบทวน** (#9A6800 on #FBEFD0): under revision; use the last effective version meanwhile.
- **Approved / อนุมัติแล้ว** (#1B5E8F on #DEEDF7).
- **Controlled / สำเนาควบคุม** (#5B3FA6 on #EBE5F8).
- **Obsolete / ยกเลิกใช้งาน** (#A31621 on #F9E0E2).
- **Draft / ร่าง** (#3A3F55 on #EEEFF5).

### Named Rules
**The Coral Restraint Rule.** Seal Coral appears on ≤10% of any screen and never on a default action. If a coral button and an indigo button sit side by side as equals, one is wrong — indigo is the system's voice, coral is the exception.

**The Status-Is-Sacred Rule.** The six document-control colors are a fixed vocabulary, not a palette to borrow from. Never reuse green/amber/violet/red status tints for decoration or for non-status UI; a colored pill in this system always means a controlled state.

## 3. Typography

**Display Font:** Anuphan (with Sarabun, system-ui fallback)
**Body Font:** Sarabun (with system-ui, -apple-system fallback)
**Label/Mono Font:** IBM Plex Mono (for document numbers, codes, counts, timestamps)

**Character:** A Thai-first pairing of two well-matched families on a real contrast axis — Anuphan's slightly tighter, more architectural display voice carries headings and titles; Sarabun's open, highly legible humanist forms carry all reading and UI text. IBM Plex Mono handles the register's machine data (control numbers, revisions) so codes line up and never get confused with prose.

### Hierarchy
- **Display** (Anuphan 700, 1.875rem/30px, 1.25, -0.01em): Page titles only — one per screen.
- **Headline** (Anuphan 600, 1.5rem/24px, 1.4): Section headers and document titles in the detail header band.
- **Title** (Anuphan 600, 1.25rem/20px, 1.4): Card titles and grouped-content headers.
- **Body** (Sarabun 400, 0.9375rem/15px, 1.6): All reading text. Cap prose at 65–75ch; dense tables may run wider.
- **Label** (Sarabun 500, 0.8125rem/13px, 1.4): UI labels, button text, form labels, table headers.
- **Code** (IBM Plex Mono 500, 0.8125rem/13px, 0.02em): Document numbers (e.g. `FM-LAB-00123`), revision counts, timestamps, counts.

### Named Rules
**The Mono-for-Machines Rule.** Anything the system generates or controls — document numbers, revisions, dates, counts — is set in IBM Plex Mono. Human-authored content is Sarabun. The reader can tell system data from prose at a glance.

**The Fixed-Scale Rule.** This is product UI, not a landing page. Type sizes are fixed rem, never fluid `clamp()`; a heading must not shrink when it lands in a sidebar or a narrow detail column.

## 4. Elevation

Soft and lightly dimensional (นุ่ม มีมิติเล็กน้อย). Depth is real but quiet: white cards rest on the cool slate page on a faint ambient shadow, and only lift further in response to state — hover on an interactive card, focus on a field. Shadows are cool-tinted and low-spread; they suggest a sheet of paper on a desk, not a floating glass panel. The system is never flat-and-borderless, and never heavy-drop-shadow.

### Shadow Vocabulary
- **Resting card** (`box-shadow: 0 1px 3px rgba(15,26,30,.08), 0 1px 2px rgba(15,26,30,.05)`): The default for cards, tables, and panels.
- **Lifted / hover** (`box-shadow: 0 4px 10px -2px rgba(15,26,30,.10), 0 2px 4px -2px rgba(15,26,30,.06)`): Interactive cards on hover; popovers.
- **Overlay** (`box-shadow: 0 12px 24px -6px rgba(15,26,30,.14), 0 4px 8px -4px rgba(15,26,30,.08)`): Menus and elevated overlays.
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(94,108,214,.35)`): The indigo focus halo on inputs, selects, and focusable controls.

### Named Rules
**The Lift-On-Intent Rule.** Surfaces rest on the resting-card shadow and rise only as a response to intent (hover, focus, open). A card that's elevated at rest with no interaction is over-shadowed; pull it back.

## 5. Components

Components are clinical and restrained: small radii (8px is the workhorse), quick non-bouncy transitions, one consistent control vocabulary across every screen. Familiarity is a feature — a button looks like a button everywhere.

### Buttons
- **Shape:** Gently rounded (8px / `--radius-md`), 38px tall at default (`md`); 32px `sm`, 46px `lg`.
- **Primary:** Institutional Indigo fill (#343E9B), white text, semibold label. The single primary action per context.
- **Secondary:** White fill, indigo text, default-gray border (#C4C8D6). The common neutral action (used widely across detail/export/workflow rows).
- **Danger:** Red fill (#C42330), white text. Destructive only (delete document).
- **Ghost / Institutional:** Ghost = transparent with secondary-text color for low-emphasis inline actions; Institutional = the deeper indigo (#262E73) for brand-weighted moments.
- **Hover / Focus:** Hover applies a subtle `brightness(0.94)` darken (no color swap, no lift). Transitions are fast (120ms) on the standard ease. Disabled drops to 50% opacity with `not-allowed`.

### Inputs / Fields
- **Style:** White fill, 1px default-gray border (#C4C8D6), 8px radius, 40px tall, with optional prefix/suffix icon slots in tertiary gray.
- **Focus:** Border shifts to brand (#4250BC) plus the indigo focus halo (`0 0 0 3px rgba(94,108,214,.35)`).
- **Error:** Border turns red (#C42330); a caption below carries the message in red. Labels sit above the field in Slate Secondary with a red required asterisk.
- **Select:** Matches the input exactly, with a custom chevron in tertiary gray (native control restyled; no reinvented dropdown).

### Cards / Containers
- **Corner Style:** 8px (`--radius-md`).
- **Background:** White (#FFFFFF) on the slate page; optional header (bottom-bordered, title type) and footer (top-bordered, slate-50 fill).
- **Shadow Strategy:** Resting-card shadow by default; interactive cards lift to the hover shadow (see Elevation).
- **Border:** 1px subtle (#E0E2EC).
- **Internal Padding:** 24px (`md`) default; 16px / 32px for `sm` / `lg`; `none` for table-wrapping cards.
- **Never nest cards.**

### Navigation
- **Sidebar:** Fixed 264px rail; section groups labelled with small slate eyebrows ("หน่วยงาน", "หมวดงาน"); active item carries indigo. Collapses on narrow (~900px) and tablet widths.
- **Tabs:** Underline style — 2px indigo underline + indigo semibold label on the active tab; inactive is Slate Secondary, darkening to Ink on hover. Optional mono count chip per tab.

### Status Badge (signature component)
- Pill-shaped (`--radius-pill`), tinted background + matching foreground from the fixed status vocabulary, with a leading solid status dot. Two sizes. This is the single most important at-a-glance signal in the register; it is never restyled or recolored per screen.

### Document-Type Tag (signature component)
- A 2-letter mono code (e.g. `QM`, `FM`, `WI`) in a small solid color chip (5px radius), color-coded by document family. Optionally followed by the Thai type name. Lets staff scan a register by type instantly.

## 6. Do's and Don'ts

### Do:
- **Do** use Institutional Indigo (#343E9B) as the one primary-action voice; keep Seal Coral to ≤10% of any screen for genuine emphasis only.
- **Do** set body text in Ink (#181B2A) and reserve Slate Tertiary (#70758C) for captions on white only — keep body contrast at WCAG AA (≥4.5:1).
- **Do** keep the six document-control status colors as a sacred, fixed vocabulary; a colored pill always means a controlled state.
- **Do** set all system-generated data (document numbers, revisions, dates, counts) in IBM Plex Mono so it reads as machine data.
- **Do** rest surfaces on the soft resting-card shadow and lift only on intent (hover/focus/open).
- **Do** keep the same control vocabulary on every screen — one button shape, one input style, one badge — and design responsively for lab tablets (collapse the sidebar, let tables scroll).

### Don't:
- **Don't** make it look like an old government web system — no dated dense tables without hierarchy, no raw system fonts, no muddy color.
- **Don't** let it feel toy-like or unserious; this is an official document register, not a playful app.
- **Don't** cram every field into one view without hierarchy — clutter erodes trust and findability.
- **Don't** import marketing-SaaS tropes: no loud gradients as decoration, no big hero-metric cards, no ad-like exuberance.
- **Don't** use gradient text, decorative glassmorphism, or `border-left`/`border-right` colored side-stripes on cards, alerts, or list items.
- **Don't** reuse status tints (green/amber/violet/red) for non-status decoration, and don't swap a button's color on hover — darken with brightness instead.
- **Don't** use fluid `clamp()` heading sizes or nest cards inside cards.
