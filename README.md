# Volt Flip

A basic React/Vite playable puzzle prototype.

## Run

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 4177
```

Open http://localhost:4177. The board is on the left, with Score, Notes, and Round controls in a fixed right sidebar. Hints and rules open from the top bar in a modal popup (Close, Escape, or click outside to dismiss). Narrow phone layouts stack the sidebar below the board. Game state and theme save to browser localStorage. Layout editing has been removed; previous saved arrangements are ignored.

## Features

- Generated 5×5 boards with calculated row/column clues
- Multiplier scoring, automatic win banking, early collection, Voltorb loss
- Hold-only circular note picker with multi-note sweeps, projected rays outside the circle, and touch long-press
- Regular and diagonally slashed not notes, poker-chip corner colors, multi-select sidebar marks, eraser mode, and note-only undo/redo
- 3D flips, lift/rotate hover with mode icons, pointer-origin score gains, animated coin deposits, explosion, and sequenced win/loss and level banners
- Continue flips tiles and clue cards into the next deal; reduced-motion support
- Locally packaged Kenney CC0 sound effects, coin sounds, jingles, and persistent mute
- Hover/focus row and column clue highlighting
- Keyboard navigation, touch-friendly note mode, optional simple deduction hints
- Plain, Neon, Club, and Pocket palettes sharing identical layout structure

Boards still use simplified difficulty distributions, not the original board tables. Collection/quit/loss progression follows the reconstructed original game logic: every safe flip including a 1 counts toward level protection; collecting quits and banks the round, including zero coins; hitting Voltorb loses round coins. Normal wins advance up to level 7. Level 8 requires finishing a level 5+ board after five consecutive non-loss rounds with at least eight safe flips each. A level-8 win stays there; other non-qualifying level-8 outcomes drop to at most 7. No free reset or practice replacement exists. A win is banked once. No money, accounts, server storage, or multiplayer.

## Checks

```sh
npm test
npm run build
npm run test:sites
```

Source: `src/App.jsx`, `src/styles.css`, `src/game.js`.

## Note picker

Hold right-click for 180 ms to open the wheel: 2 upper left, 1 upper right, 3 lower left, bomb lower right. Entering a slice toggles it; sweep across multiple slices or revisit to toggle off. Rays extend outside the circle. Release closes without another toggle; already chosen notes remain. Quick right-click does nothing. In notes mode either mouse button can be held; short left-click applies the sidebar selection. Ctrl + either mouse hold opens not notes in either mode, and that type stays locked throughout the gesture even if Ctrl is released. The sidebar slash button is an alternative. Shift-right is not a reliable shortcut because some browsers reserve it.

Sidebar marks are multi-select. Select Clear beneath the grid to erase both types on clicked tiles. Each grouped mark or clear is one undoable edit. Adding a regular or not note removes the opposite mark for that value. On touch, hold for 420 ms. Shift+F10 opens the keyboard picker. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl/Cmd+Y) undo/redo notes while the board has focus. Reveals and round changes clear note history.

## Sidebar layout

One continuous right sidebar groups score, labeled Flip/Edit notes modes, a 2×2 note picker (2/1 above 3/Voltorb), and collection controls. Undo/redo remain on keyboard shortcuts; sidebar history buttons are removed. Coin icons denote total tile points in row/column clues. Clue points are added tile values; round coins multiply revealed values. Hints and rules remain in the header popup. Vite uses polling to detect file changes across workspace boundaries.

Rule sources: https://github.com/pret/pokeheartgold/blob/master/src/voltorb_flip/voltorb_flip_game.c and https://www.scotteh.me/voltorb/fieldgen.html . Cash Out has a dynamic Collect N coins sublabel; next-level predictions and safe-flip helper text are removed. Continue starts the calculated next level with a deal animation. Reload resumes rather than exits a session. Original board distributions and the original 50,000-coin bank cap/shop behavior are outside this prototype.

## Emerald visual implementation

The default Emerald skin implements the approved simplified casino direction with emerald/gold/ivory tokens, self-hosted Bree Serif, clear Flip/Edit notes controls, and the existing mechanics. Theme preference now uses `vf-skin-v2` so existing users see the selected design; game storage is unchanged.

Generated asset: `public/assets/emerald-felt.png`, produced with the built-in ImageGen tool. Prompt: a seamless, evenly lit, deep emerald felt material with very fine low-contrast fibers, no objects, text, symbols, patterns, gradients, borders or vignette. Resized to 768 × 768 for use as the table/card-back texture. No scene or decorative card art is used.

Real browser QA is documented in `design-qa.md`. Run `PLAYWRIGHT_BROWSERS_PATH=../../work/playwright-browsers node tests/browser-check.mjs` after installing Chromium with Playwright. The browser test uses an isolated fixture context and does not overwrite your browser's saved game.

## Videogame skins

The dropdown also includes Pocket Park (mint/coral handheld look and original pixel foliage), Dark World (plum/cream/mint RPG menus), and Dream Cartridge (periwinkle/apricot). All share the same board, note picker, eraser, and round controls; changing skins preserves the current game and persists the choice. Pixelify Sans and Nunito are self-hosted through Fontsource. Their OFL license files are in public/assets/fonts. The Pocket Park backdrop is an original generated asset at public/assets/pocket-park-background.png.

## Solver tab

Play and Solver share the board grid, flipping tile and clue-card components. Solver edits are stored separately under vf-solver and never change game progress. Type points/bomb clues on the board edges, use Tab/Enter to advance, paste ten pairs (five rows then five columns), or import the current game's public clues and revealed tiles. Hover/tap a tile to choose its revealed value; right-click or use its eraser to clear it. Choices recalculate the heatmap automatically.

Percentages are exact under the selected uniform matching-board model. Any board uses clues and reveals only; Volt Flip also uses the exact local generator composition for the selected level. Original HGSS uses level compositions from the pret/pokeheartgold decompilation, but omits rejection-layout/RNG weighting and is explicitly labeled approximate. No hidden game values enter the solver. A worker performs the bounded search without blocking input. Invalid clues and unfinished searches have explicit messages and never fabricate probabilities. Recommendations prioritize exact minimum bomb risk, then expected tile value. With up to 256 compatible boards, tied moves search complete adaptive continuations within a 120 ms/12000-state budget. Finished searches show a clear chance under the safety-first, higher-value policy; unfinished searches never publish partial win odds. Fallback moves look one reveal ahead for new safe multiplier opportunities when the complete solution set fits within 2048 boards and an 80 ms budget. Surviving information gain breaks remaining ties; only fully equal ranks are randomized. Larger searches fall back to exact odds and information gain. Guaranteed 1s stay ahead of risky tiles for level protection. Suggestions disappear during recomputation and remain stable on hover. This is a bounded recommendation heuristic, not a globally optimal win policy. The counting engine cross-propagates row/column patterns, searches the tighter axis and prunes unreachable residual sums/bomb counts. One remaining board shows Solved and automatically flips over the remaining solution values, with Show heatmap and New puzzle controls. Recording all possible 2s and 3s shows YOU WIN, while entering a bomb shows YOU LOSE; both offer Restart or Continue. Continue preserves entries. Certain bombs have charcoal tiles with ivory icons. Clear tiles keeps the clues; Clear all/New puzzle clears all solver entries.

Additional checks: tests/solver.test.mjs validates counting and marginals against independent enumeration, tests/solver-browser-check.mjs exercises quick entry, live updates, stable hover/touch chooser, solved/restart, skins, persistence and game-state isolation.

Auto notes (enabled by default, independently persisted) displays exact remaining value possibilities with the game's corner marks. Hover/focus a solver tile to see its 1/2/3/bomb probability breakdown in the sidebar. Auto marks never modify recorded values or game notes.

Level count reference: https://github.com/pret/pokeheartgold/blob/master/src/voltorb_flip/voltorb_flip_game.c (sBoardConfigs). The HGSS selector uses count constraints only; it is not an exact emulator of the original generator. The pulsing suggested-cell outline honors reduced motion. Hover statistics reserve their space to keep controls stable.

## Strategy objectives and measured performance

The solver's Goal selector offers Safest move (default), Clear the round, and Protect level. Clear optimizes finishing the round; Protect first optimizes retaining at least the selected level, then winning. All take guaranteed-safe reveals before risky ones. Completed bounded searches may trade immediate risk/value for the chosen goal; incomplete plans explicitly use the safest fallback. Level 8 protection requires winning unless future support adds enough history for its special retention rule. Goal persists through import/reset/reload.

Run `npm run benchmark:solver` to reproduce the seeded comparison and generate `qa/strategy-benchmark.html` with full per-round JSON alongside it. On 2000 local-game boards (250 per level), Safest move won 51.25%, Clear the round 54.40%, Protect level 54.50%; mean banked coins per round were 302.99, 330.02 and 330.31. Protection rates were 81.30%, 81.25% and 81.75%. The small protection difference is inconclusive. These are paired isolated rounds played to win/loss with no cash-out, and do not represent HGSS outcomes or optimize a coin-stopping policy. Benchmark wall-clock limits are disabled for deterministic work-bounded comparisons; the live UI also uses its response-time cap.

## GitHub Pages

The `Deploy to GitHub Pages` workflow tests and publishes the static app on every push to `main`, or when run manually in Actions. Repository Settings → Pages must use **GitHub Actions** as its source. The workflow reads the site's base path automatically, so scripts, solver workers, skins, and sounds load correctly from a project URL.

For a local production build matching this repository's Pages path, run `npm run build:pages -- --base=/volt-flip/`. The deployable files are in `dist/client`; the separate `npm run build` command still prepares the Sites scaffold.
