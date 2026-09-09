# CMSG Group Web — design tokens v1

These tokens are the source of truth for the first visual candidate. Keep component
styles semantic; change the values here and in `static/site/css/tokens.css` when a
new visual version is approved.

## Color

| Token | Value | Use |
| --- | --- | --- |
| `ink-950` | `#151619` | Primary text and dark surfaces |
| `ink-700` | `#42454b` | Secondary text |
| `paper-50` | `#fbfaf7` | Page background |
| `paper-100` | `#f3f0e9` | Raised section background |
| `line` | `rgba(21, 22, 25, .15)` | Hairline borders |
| `copper-600` | `#a45d3b` | Single accent, active states, calls to action |
| `copper-100` | `#eadbd1` | Accent tint |
| `hero-overlay` | `rgba(11, 16, 28, .52)` | Artwork legibility layer |

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
