---
name: Good Spin
description: A playful, browser-local prize wheel.
colors:
  bg: "#f7f5ef"
  ink: "#233b32"
  accent: "#285d46"
  on-accent: "#ffffff"
  surface: "color-mix(in srgb, #f7f5ef 45%, white)"
  muted: "color-mix(in srgb, #233b32 78%, #f7f5ef)"
  line: "color-mix(in srgb, #233b32 18%, #f7f5ef)"
  cat1: "#f3bf53"
  cat2: "#b9cdb8"
  cat3: "#eaa895"
  cat4: "#c1b8dc"
  dark-foreground: "#17271f"
  error-bg: "#ffe3da"
  error-ink: "#9b321c"
  notice-ink: "#842b19"
  wheel-separator: "#fffdf8"
typography:
  display:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(40px, 4.4vw, 64px)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Outfit, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.025em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  input: "8px"
  button: "9px"
  result: "12px"
  panel: "16px"
  nav-item: "25px"
  pill: "30px"
spacing:
  mobile-gutter: "20px"
  desktop-gutter: "32px"
  desktop-panel-gap: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.button}"
    padding: "13px 22px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "9px 15px"
  button-text:
    textColor: "{colors.accent}"
    padding: "10px 0"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "12px 14px"
  entry-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "28px 32px"
  probability-total:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "9px 16px"
---

# Design System: Good Spin

## Overview

Good Spin uses playful geometry, warm cream, forest green, and four pastel category colors. A large circular wheel anchors a calm interface with bold rounded headings, restrained borders, and clear controls.

Source of truth: `styles.css` and `app.js`. These tokens describe the default runtime theme; theme controls and category editors can change the palette.

## Colors

Cream is the canvas; forest green supplies text and primary actions. Golden yellow, sage, peach, and lavender distinguish the four categories. Muted text, borders, and surfaces derive from the current background and text colors using the frontmatter’s mix ratios. `app.js` replaces the initial CSS fallback values when applying a theme.

Accent and category foregrounds switch between white and the dark foreground using the implemented luminance check. Peach error surfaces retain fixed error ink. The alternate Berry and Lagoon presets change the palette without changing component geometry.

## Typography

Self-hosted Outfit bold supplies headings, the wordmark, and wheel hub. Self-hosted DM Sans supplies body copy, forms, and wheel labels; CSS requests heavier UI weights where needed. Headlines use tight tracking; body text stays relaxed. Odds and history timestamps use tabular numerals.

The entry heading is 40px at the base layout, 34px below 1000px, 31px below 720px, and 44px from 1400px. Mobile introductory headings are 42px; page titles are 40px.

## Layout

The main container is capped at 1240px, with 32px horizontal padding and a 1.55:1 wheel/form split. The header is capped at 1400px. Below 1000px the split tightens to 1.3:1 and prize rows become two columns. Below 720px the wheel and form stack, gutters become 20px, settings fields reflow, and history scrolls horizontally within its container. At 1400px the wheel grows from its usual 430px cap to 450px; mobile caps it at 390px.

Prize listings use four flat columns at desktop, horizontal dividers, and compact thumbnails. Keep editing and history denser than the play surface.

## Elevation & Depth

Surfaces are primarily flat, differentiated by tint and fine borders. Soft shadows lift only the selected navigation item, wheel, and wheel hub. Exact shadow values live in the sidecar. Avoid adding unrelated floating panels.

## Shapes

The wheel, hub, dots, and swatches are circular. A clipped geometric pointer marks the winner. Panels use the panel radius, inputs and secondary buttons use the input radius, and the navigation and total badge are pills. Prize thumbnails and result blocks use gently rounded corners.

## Components

Primary actions are solid accent buttons with a slightly darker mixed hover color and a 1px pressed translation. The spin action spans its panel with larger padding. Secondary buttons are bordered surface controls; text actions remain visually light. Disabled buttons reduce opacity to 0.5.

Inputs are surface-filled with thin borders. Interactive elements receive an accent outline (3px, 4px offset). Navigation uses a tinted pill track and a surfaced active item. Errors combine readable copy and warm error color.

The SVG wheel has equal slices regardless of configured odds, category fills, a pale outer rim, and short prize labels. The default spin lasts 4800ms with `cubic-bezier(.12,.65,.12,1)`; reduced motion makes the rotation immediate and disables CSS transitions. Results appear within the entry panel after the outcome is saved.

## Do's and Don'ts

- Do preserve equal visual slices and show the actual winning percentages separately.
- Do use theme variables for surfaces, text, controls, and category accents.
- Do keep keyboard focus visible, retain control focus during editing, and honor reduced motion.
- Do keep prize names and category labels readable alongside color.

- Don’t imply that slice size represents probability.
- Don’t introduce remote font dependencies or replace the self-hosted font pairing.
- Don’t treat custom palette choices as guaranteed accessible; retain contrast-aware foregrounds.
