# Tilth integration status

Updated 10 September 2026. Branch: `codex/tilth-integration` in `shresthkapoor7/tilth`. This feature branch combines the pushed gameplay-improvements branch at `2a23f44`, latest main at `6f2e8fc`, and our environment/notebook work. Teammate main and other feature branches are not overwritten. Unpushed teammate edits are not available for comparison.

- [Cinderwatch scenery](docs/ENVIRONMENT_ART.md): 17 first-pass generated assets, 15 loaded in gameplay, all three building exteriors, outdoor props, ground/lava/bridge and all existing interiors covered. Props have verified alpha. Runtime images are optimized WebP; full-resolution lossless masters and prompts are retained. The active new files total 1.04MB. Scene changes reuse cached art.
- [Notebook](docs/NOTEBOOK_PORT.md): discover the inn-table notebook, create water/torch/stone, author a bounded use law, and change the kindling's actual state. Objects use the teammate's existing inventory, ownership, world events and save. AI drafts require explicit inscription; labeled handwritten examples work offline. No generated JavaScript or duplicate simulation.
- The teammate's usable objects, containers, witnessed consequences, traits, roaming enemies, combat, quest-earned awakening combos, boundary witch and generated regions remain integrated. Camera selection now handles the 1600×1200 backing canvas and centered inn zoom.
- No new character artwork was generated in this pass. The previous illustrated inn character proof and its explicit Drawn/Pixel controls remain; unsupported editor appearances still have their existing fallback. Generated outdoor regions and creatures retain their original rendering.
- Automated validation: 143 Node tests and 6 Vitest tests pass, including shared notebook entities accepted by the narrator API; TypeScript typecheck and the documented production build pass. One upstream test used a Linux-only executable; it now uses Node for a portable failure/retry check.
- Browser verification: transparent scenery, art switching, actual room entry/exit, profile preservation, notebook discovery, no-effect-before-law, extinguishing after use, shared pickup, save/reload, phone layout, AI draft acceptance with two explicit test responses, generated-region entry/return/revisit and safe reload. No page errors in these walkthroughs. Model fixtures are not a live-provider performance measurement.
- The ignored local `.env` still contains the existing API key. Generation uses `gpt-5.6-terra`; the newly merged world narrator is locally configured to use the same API/model instead of an absent Claude CLI. Provider metadata reports configured. Earlier live Rowan quests were verified; the new notebook AI flow was tested with fixtures, not claimed as a new live model run. Credentials are not committed.

Run locally:

    node --import tsx node_modules/vite/bin/vite.js --configLoader native --host 127.0.0.1 --port 5174 --strictPort

Preview: http://127.0.0.1:5174/ . Other machines require their own server-side environment settings.

Build on this Windows host:

    node --import tsx node_modules/vite/bin/vite.js build --configLoader native --minify false --target esnext

Remaining scope: the notebook exposes a small explicit vocabulary, prepared object forms and one target, not arbitrary world rewriting. Universal drawn characters, foreground occlusion and generated-region artwork remain separate work. Public GitHub source is not a hosted game deployment.
