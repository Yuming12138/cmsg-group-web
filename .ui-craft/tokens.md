# CMSG Group Web — design tokens v2

These tokens are the source of truth for the current visual candidate. Keep component
styles semantic; change the values here and in `static/site/css/tokens.css` when a
new visual version is approved.

## Color

| Token | Value | Use |
| --- | --- | --- |
| `ink-950` | `#101923` | Primary text and dark surfaces |
| `ink-700` | `#40515f` | Secondary text |
| `ink-500` | `#647583` | Metadata and tertiary text |
| `paper-50` | `#ffffff` | Primary page canvas |
| `paper-100` | `#f6f9fc` | Subtle cool surface and hover tint |
| `paper-200` | `#e8eef5` | Image placeholders and quiet fills |
| `line` | `rgba(16, 25, 35, .14)` | Hairline borders |
| `blue-600` | `#245f91` | Single accent, active states, calls to action |
| `blue-700` | `#17466f` | Accent hover, links, and small text |
| `blue-100` | `#e5eff8` | Accent tint |
| `hero-overlay` | `rgba(8, 20, 37, .58)` | Artwork legibility layer |

## Type

- Display: `Iowan Old Style`, `Palatino Linotype`, `Book Antiqua`, `Georgia`, serif
- UI/body: `Inter`, `Helvetica Neue`, `Arial`, sans-serif
- Mono/meta: `ui-monospace`, `SFMono-Regular`, `Menlo`, monospace
- Base size: `16px`; body line-height: `1.55`
- Display tracking: `-0.035em`; metadata tracking: `.12em`

## Space and shape

`4px · 8px · 12px · 16px · 24px · 32px · 48px · 64px · 96px · 128px`

- Cards: `10px` radius
- Controls: `6px` radius
- Display panels: `18px` radius
- Borders stay 1px; depth comes from whitespace and low-opacity shadows

## Content frame

- Desktop content max: `1240px`; page gutter: `32px`
- Tablet content max: `760px`; page gutter: `20px`
- Mobile page gutter: `16px`
- Every page shares this outer frame. Timeline rails, galleries, and long-form
  reading columns may use their own internal proportions without changing the frame.
