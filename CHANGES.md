# CloudReady: design and motion upgrade

Applied with the design-super and animation-super skills. Feel level: **subtle to more** (180-420ms, ease-out, no overshoot except the quiz result card).

## New / changed files
- `src/polish.css` (new, imported last): tokens, accessibility base, component fixes, motion system, reduced-motion.
- `src/main.jsx`: accessible dropdown, skip link, route handling, quiz feedback, flashcard markup, password toggle, count-up, reveal hook.
- `src/style.css`, `src/portal.css`: de-minified (one rule per line), type scale raised (nothing under 12px), low-contrast greys replaced with `--muted` (#5b5a7e, 6.5:1 on white; was 4.3:1).
- `index.html`: color-scheme meta, noscript fallback.

## Design
- Contrast: muted text 4.3 -> 6.5:1; placeholders 2.3 -> 5:1; semantic ok/warn/error tokens.
- Type: body copy 14-16px (was 10-13px); inputs 16px on mobile (stops iOS zoom).
- Tap targets 44px on buttons, icon buttons, menu toggle, nav links.
- Visible focus ring on every control; skip link; focus-safe `main`.
- Quiz: correct/incorrect options marked with icon + colour + text; answers lock after choosing (score now reflects first attempts); progress bar has `role=progressbar`.
- Flashcards: valid markup (no heading inside a button), arrow-key navigation, live-region announcement.
- Study tools menu is a real disclosure (aria-expanded, Escape, outside click), works by keyboard and touch.
- Password show/hide, document title per route, scroll reset on navigation.

## Motion (tokens in `polish.css`)
- Hero sequence: staggered text, panel rise, score ring and bars draw in once, gentle float (pauses off-screen).
- Scroll reveal via IntersectionObserver (classes removed after play, so hover is unaffected).
- Route enter, quiz card/explanation enter, result pop, flashcard face swap, sliding nav underline.
- Dropdown grows from its trigger; mobile menu and portal drawer slide, and stay out of the tab order when closed.
- Buttons press to 0.97; hover lift only on `(hover:hover) and (pointer:fine)`.
- Only transform/opacity animate (ring uses a one-off registered `@property`).
- `prefers-reduced-motion`: travel, scale, loops and reveals removed; state changes stay visible.

## Not verified
No `npm install` was possible in the authoring sandbox, so run `npm install && npm run build` once. JSX/CSS were syntax-checked with esbuild, `audit_motion.py` reports 0 errors, and key components were rendered in a static harness at 1280px and 375px.

## Suggested next
Dark theme (tokens make it a small step), real quiz bank wired to `/api/progress`, add the missing `.env.example` referenced in the README.
