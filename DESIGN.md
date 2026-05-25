---
tokens:
  colors:
    brand:
      primary: "#027373"
      light: "#04BFAD"
      dark: "#015c5c"
    surface:
      background: "#ffffff"
      foreground: "#171717"
      sidebar: "#0f172a"
      card: "#ffffff"
      border: "#e2e8f0"
    status:
      success: "#34a853"
      warning: "#ffc107"
      danger: "#ea4335"
      info: "#17a2b8"
  typography:
    family:
      sans: "Inter, sans-serif"
    weights:
      normal: 400
      medium: 500
      semibold: 600
      bold: 700
  radii:
    small: "0.25rem"
    base: "0.5rem"
    large: "0.75rem"
    full: "9999px"
  shadows:
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
    brand: "0 10px 15px -3px rgba(2, 115, 115, 0.2)"
  spacing:
    xs: "0.25rem"
    sm: "0.5rem"
    md: "1rem"
    lg: "1.5rem"
    xl: "2rem"
---

# Design System: Gestura.ai

## Visual Concept
Gestura.ai is a professional-grade annotation and curation platform designed for the complex task of processing Sign Language (SIBI) datasets. The visual language strikes a balance between high-density data representation and an approachable, clean aesthetic that reduces cognitive load during long annotation sessions.

## Color Strategy
The platform utilizes a confident **Teal** as its primary brand color. This shade is highly visible but easier on the eyes than aggressive blues or reds, making it ideal for a workspace where users spend hours staring at video frames. 

- **The Workspace**: The primary canvas is bright and neutral (`#ffffff`), ensuring that video content and text transcripts remain the focal point without color interference.
- **The Navigation**: The sidebar acts as the structural backbone of the app, adopting a deep, immersive Slate tone (`#0f172a`). This high-contrast approach clearly separates global navigation from the active workspace. Active items in the sidebar use the primary Teal, creating a striking yet elegant highlight.
- **Status Indicators**: Functional colors (Success, Warning, Danger) are vibrant and unambiguous, used sparingly to draw attention to critical job statuses, pipeline errors, or validation flags.

## Typography
Driven by the **Inter** typeface, the typography is highly legible at small sizes, which is crucial for dense data tables, transcripts, and timeline metadata. Weights are used purposefully: `medium` for secondary labels, `semibold` for primary actions and table headers, and `bold` for clear structural hierarchy in page titles.

## Shapes and Elevation
The interface avoids sharp, aggressive corners. A standard border radius (`0.5rem`) is applied universally across buttons, cards, and input fields, lending a modern, polished feel. 
Elevation is used functionally rather than decoratively:
- Flat surfaces are the default.
- Subtle shadows (`shadow-md`) lift interactive dropdowns, popovers, and floating tooltips above the canvas.
- A specialized tinted "brand" shadow accompanies primary actions and active states, adding a soft, glowing emphasis without feeling heavy.

## Layout and Density
Designed for utility, the platform favors structured, grid-based layouts. Spacing is tight enough to display complex pipeline jobs and video segments simultaneously, yet breathable enough to prevent visual clutter.
