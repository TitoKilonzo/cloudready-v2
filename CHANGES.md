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

## Round 2: dark theme rebuilt, sidebar rail, command palette

### Fixes to my earlier work
- Portal sidebar showed the desktop nav underline inside the white active pill: underline now only on the public header.
- Hero "72%" was shrunk by a leaking `.scoreCircle span` rule: fixed (`.countUp`).
- The first dark theme swapped colour variables inside the light CSS, so mixing old and new files gave a half-dark, half-light page. Replaced by the approach below. **Replace the whole project folder; do not mix files from different zips.**

### Dark theme (`src/dark.css`, self-contained)
- Everything is scoped under `html[data-theme='dark']` and overrides the light value directly. The light CSS has no theme variables, so light mode is untouched.
- ~120 derived rules (every background, text colour and border) generated from the light CSS by `tools/gen-dark.py`, plus hand-tuned parts: gradients, sidebar, auth panel, quiz states, shadows.
- Dedicated dark illustration: `public/cloudready-learning-dark.svg` (hero and sign-in). No filter hacks.
- Contrast checked: ink 14.7:1, muted 7.4:1, accent 7.8:1, white on primary 5.0:1, status text >= 8:1.
- Theme is set on `<html data-theme>` before first paint (inline script in `index.html`), follows the system setting until you choose, remembers the choice (`cr_theme`), crossfades with View Transitions (instant under reduced motion).
- Toggle in public, sign-in and portal headers, and a command in the palette.

### Sidebar that hides until hover (portal, desktop with a mouse)
- Collapsed = 76px icon rail. Hover or keyboard focus slides it open over the page (no layout shift) using clip-path and opacity.
- Pin button in the sidebar footer keeps it open and pushes the page; choice is remembered (`cr_sidebar_pinned`). Also in the palette ("Pin sidebar open").
- Touch devices and phones keep the existing drawer.

### New feature: command palette (Ctrl/Cmd + K, or `/`)
- Search every page and action: go to quiz, flashcards, planner, progress, assistant, resources; switch theme; pin sidebar; sign in/out.
- Accessible combobox/listbox: arrow keys, Home/End, Enter, Esc, focus returns to where you were, screen-reader labels.
- Search button in the header (icon-only on phones; inside the mobile menu on small phones).

### Verified
Bundled the real `main.jsx` (with stand-ins for the router and icon packages, since npm is blocked here) and drove it in Chromium: portal rail, hover expand, pin, palette search/Enter/Esc, theme switch from palette and toggle, sign-in, home, 375px mobile (no horizontal scroll). `audit_motion.py`: 0 errors. Still run `npm install && npm run build` once on your side.
