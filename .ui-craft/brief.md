# CMSG Group Web — foundation brief

## 1. Product identity

- **Surface:** content-driven academic research group website
- **Primary audience:** prospective collaborators, students, researchers, and visitors
- **Voice:** precise, calm, bilingual-ready, evidence-led
- **Stage:** visual foundation; current copy is intentionally placeholder content

## 2. Design intent

The site should feel like a carefully edited research journal: quiet in its chrome,
confident in its typography, and generous with visual rhythm. The home page uses
the user-provided image of Kandinsky's *Composition VIII* as an immersive hero
backdrop. The rest of the interface returns to an ivory paper tone so research
content remains legible.

## 3. Experience principles

1. **Content is data.** Navigation, section headings, cards, people, publications,
   and events live in `content/*.json`; templates provide structure only.
2. **One clear hierarchy.** A visitor should understand the group's scope, current
   work, and next path within one scroll.
3. **Editorial restraint.** Use a warm neutral base, charcoal ink, one copper accent,
   hairline rules, and intentional asymmetry. Avoid decorative gradients, emoji, and
   repeated icon-card patterns.
4. **Progressive disclosure.** Keep the home page concise; section pages can grow
   without requiring a new layout.
5. **Accessible by default.** Visible focus, keyboard navigation, semantic landmarks,
   readable contrast, and reduced-motion support are non-negotiable.

## 4. Current visual candidate (v1)

- **Aesthetic lane:** editorial Swiss grid with a museum-catalogue calm
- **Theme:** ivory / charcoal / copper, with the hero image providing the color field
- **Typography:** system humanist sans for interface copy, restrained serif for display
- **Motion:** subtle 300ms reveal and hover transitions; no scroll-jacking
- **Signature bet:** the global navigation stays quiet while a compact, centered hero
  composition sits directly over the artwork
- **Variance:** 6/10; enough asymmetry to feel authored, still easy to scan

## 5. Content strategy

All visible copy in this first pass is marked as a placeholder. Replace values in the
JSON files before publishing factual claims, dates, names, or links. The loader keeps
the schema intentionally small so future content work does not require a template
rewrite.

## 6. Learned constraints

- The user wants multiple visual iterations before committing to final content.
- The home page should use the provided Kandinsky *Composition VIII* image as a large
  background treatment.
- This foundation may use placeholders; do not infer or publish old content as fact.
- The repository should remain easy to roll back to the baseline branch.
- The publications archive should stay compact and close to the legacy continuous-citation
  timeline: smaller regular text, restrained title weight, and a left-aligned year rail.
  Its accent should follow the current site palette rather than copying the legacy blue.
- The events timeline is image-led: show the activity type, title, and date, but keep
  explanatory summaries in the content data for future use rather than displaying them.
- The home hero uses a compact centered composition: a bold group name above a short
  welcome line, one concise AI/materials-design statement, and a single copper Discover
  action. Keep the text block visually smaller than the artwork on desktop and mobile.
- Homepage English copy uses Arial; Chinese copy uses Microsoft YaHei/微软雅黑. Do not
  restore the oversized serif display treatment for the hero.
- Hero motion should remain composition-led: a slow background breath plus low-amplitude
  SVG geometry response on fine pointers, with touch devices and reduced-motion users on
  a quieter path. Avoid particle fields or high-frequency effects.
