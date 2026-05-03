---
status: completed
branch: main
timestamp: 2026-05-04T00:10:00+05:30
files_modified: []
---

## Working on: Name My Frame — Figma Plugin (Production Build)

### Summary

Built a production-ready Figma plugin called "Name My Frame" from scratch. The plugin renames selected Figma frames to sequential dot-notation format (e.g. 31.1, 31.2, 32.1) based on spatial row-aware ordering. All 8 implementation tasks are complete, 22 tests pass, and the production build outputs correctly to `dist/`.

---

### The Idea

Designer selects frames in Figma → opens plugin → enters a base number (e.g. `31`) → plugin detects rows spatially → renames frames `31.1, 31.2 … 31.10` (row 1) and `32.1 … 32.5` (row 2) → live preview before applying → atomic rename with single Ctrl+Z undo.

---

### Design Decisions (from brainstorming + grill-me sessions)

- **Naming format:** `{base}.{sequence}` — flat sequential, no rollover past .9 (e.g. .10, .11 valid)
- **Row detection:** tolerance = average frame height × 0.5 (relative to selected set, not hardcoded pixels)
- **Row ordering:** left-to-right within row, top-to-bottom across rows; each row increments base by 1
- **Existing names:** fully replaced (not prefixed/appended)
- **Non-frame layers:** silently ignored in mixed selections
- **Undo:** all mutations in a single `onmessage` handler = one Ctrl+Z step (Figma's documented behavior)
- **Rollback:** snapshot original names before apply; restore on any error
- **Persistence:** `figma.clientStorage` stores last used base number
- **Preview:** computed in UI thread (no sandbox round-trip) with 150ms debounce
- **Modal:** stays open after rename; success/error banner shown
- **Distribution:** public Figma Community, Figma design files only (not FigJam)
- **Separator:** hardcoded dot (not configurable — YAGNI)

---

### Architecture

Two isolated Vite build targets:

```
src/ui/ (React + Vite → dist/index.html, single inlined file)
src/code.ts (IIFE → dist/code.js, Figma sandbox)
src/shared/ (pure TypeScript — shared by both, no runtime bundle)
```

Message protocol:
| Message | Direction | Payload |
|---|---|---|
| `INIT` | code → UI | `{ lastBaseNumber: number \| null }` |
| `SELECTION_CHANGE` | code → UI | `{ frames: FrameInfo[] }` |
| `RENAME_REQUEST` | UI → code | `{ baseNumber: number }` |
| `RENAME_RESULT` | code → UI | `{ success: true, count }` or `{ success: false, error }` |

---

### Implementation Plan Executed (8 Tasks)

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Project scaffold | ✅ | `f7d0d45` |
| 2 | Shared types (`FrameInfo` + `PluginMessage`) | ✅ | `094ec25` |
| 3 | Row detection algorithm + 11 Vitest tests | ✅ | `39dab5f` |
| 4 | Figma sandbox `code.ts` | ✅ | `06f7d56` |
| 5 | UI components (NumberInput, PreviewList, StatusBanner) + RTL tests | ✅ | `1d4de23` |
| 6 | `App.tsx` — state + message bridge | ✅ | `cbf37e8` |
| 7 | UI entry, HTML template, styles | ✅ | `cbf37e8` |
| 8 | Build verification | ✅ | `cb699aa` |

---

### File Map

| File | Responsibility |
|---|---|
| `manifest.json` | Figma plugin manifest — `"ui": "dist/index.html"` |
| `package.json` | Dependencies + build scripts |
| `vite.config.ts` | Dual build: UI (React + singlefile) and code (IIFE) |
| `vitest.config.ts` | Vitest with jsdom environment |
| `tsconfig.json` | Base TypeScript config |
| `tsconfig.plugin.json` | Figma sandbox — `types: ["@figma/plugin-typings"]` |
| `tsconfig.ui.json` | UI — DOM + JSX + `vite/client` + jest-dom |
| `src/shared/types.ts` | `FrameInfo` + `PluginMessage` discriminated union |
| `src/shared/rowDetection.ts` | `detectRows()` + `assignNames()` — pure functions |
| `src/code.ts` | Figma sandbox: selection listener, rename handler, rollback, clientStorage |
| `src/ui/index.html` | Vite HTML entry |
| `src/ui/main.tsx` | React root mount |
| `src/ui/App.tsx` | State, message bridge, debounced preview |
| `src/ui/components/NumberInput.tsx` | Controlled numeric input (min 1, max 9999) |
| `src/ui/components/PreviewList.tsx` | Scrollable preview list; exports `PreviewItem` |
| `src/ui/components/StatusBanner.tsx` | Success/error banner |
| `src/ui/styles.css` | All plugin UI styles (CSS custom properties) |
| `tests/setup.ts` | jest-dom matchers |
| `tests/rowDetection.test.ts` | 11 unit tests for detectRows + assignNames |
| `tests/components/NumberInput.test.tsx` | 4 RTL tests |
| `tests/components/PreviewList.test.tsx` | 4 RTL tests |
| `tests/components/StatusBanner.test.tsx` | 3 RTL tests |

---

### Test Results

```
Test Files  4 passed (4)
     Tests  22 passed (22)
```

---

### Build Output

```
dist/code.js    2.9 KB   (IIFE — Figma sandbox)
dist/index.html 193 KB   (single inlined React app)
```

---

### Bugs Fixed During Implementation

1. **`tsconfig.plugin.json` — `typeRoots` → `types`**
   - `typeRoots` doesn't resolve scoped packages like `@figma/plugin-typings`
   - Fixed: `"types": ["@figma/plugin-typings"]`

2. **`tsconfig.ui.json` — missing `vite/client`**
   - `main.tsx` imports `./styles.css` as side effect; TypeScript didn't know how to type CSS imports
   - Fixed: added `"vite/client"` to `types` array

3. **`manifest.json` — `dist/ui.html` → `dist/index.html`**
   - Vite names output after input filename (`src/ui/index.html` → `dist/index.html`)
   - Original spec assumed `dist/ui.html`; updated manifest to match actual output

4. **`NumberInput.test.tsx` — controlled input test flakiness**
   - `userEvent.clear()` + `userEvent.type('42')` on a controlled input with mocked `onChange` gives `12` not `42`
   - Root cause: mock doesn't update state → React re-renders input back to `value=1` → typing appends to `1`
   - Fixed: replaced with `fireEvent.change(input, { target: { value: '42' } })`

---

### How to Load in Figma

1. Open Figma desktop
2. Main menu → Plugins → Development → Import plugin from manifest…
3. Select `/Users/vinoy/name-my-frame/manifest.json`
4. Run: Plugins → Development → Name My Frame

### Manual Test Checklist

```
□ No frames selected → "Select frames to rename" + button disabled
□ Select 3 frames → preview shows 1.1, 1.2, 1.3
□ Type 31 → preview updates to 31.1, 31.2, 31.3 (debounced ~150ms)
□ Click "Rename Frames" → layers panel shows 31.1, 31.2, 31.3
□ Modal stays open, green "Renamed 3 frames" banner appears
□ Ctrl+Z → all names revert in one undo step
□ Close + reopen → base number field shows 31 (persisted)
□ 10 frames row 1 + 5 frames row 2, base=31 → 31.1–31.10, 32.1–32.5
□ Mixed selection (frames + groups) → only frames renamed
```

---

### Next Steps

- [ ] Load plugin in Figma desktop and run manual test checklist above
- [ ] Publish to Figma Community (Plugins → Development → Publish)
- [ ] Install gh CLI (`brew install gh`) for GitHub issues if needed
