# Notebook in Tilth

Hayden chose one complete interaction and then explicitly selected the teammate’s `codex/tilth-gameplay-improvements` as its foundation: discover the notebook, create an object, write a law, use the object, and observe a persistent consequence.

The notebook and burning kindling tray sit on the inn table as ordinary shared-world fixtures. The first discovery uses a character thought. N reads the nearby notebook; G uses the selected created object on the tray. The existing object action panel also offers Read notebook. These are input labels, not objective banners telling the player a solution.

## Scope and behavior

The two pages are Create an object and Write a law. AI translates a short description into a strict draft. The player reviews and inscribes it. A separately labeled handwritten page works without an AI request; failures never silently substitute it.

Three prepared object forms are available: water vessel, torch, and stone. An accepted object appears on clear ground beside the player as a normal portable world entity. Existing pickup, drop, give, visibility and ownership rules use that exact entity. There is no separate notebook inventory.

A law responds only to explicit use of a created object on the flammable kindling tray. It matches liquid, heatSource, or stone, then sets or clears fire or wetness. Setting wet also extinguishes fire, and wet kindling cannot ignite. Four object spaces and four law lines bound the first interaction. Each enabled law is evaluated once per use in inscription order. Status changes do not recursively trigger laws. Objects and rules can be erased; laws can be disabled.

Water has no automatic extinguishing effect before an applicable law is written. Inscribing the law alone does not change the flame. Using the water afterward changes the tray’s actual fire property, its drawing, witnessed event history, the player’s thought, and persisted state. The rule subsequently executes without a model or image request.

## Ownership

- `engine/notebook-core.js`: strict portable-object and bounded-rule contracts, examples, and constants. No room simulation.
- `engine/notebook-world.js`: notebook metadata and atomic operations inside the existing `WorldSimulation`. Canonical positions, ownership, target status and memories remain in shared entities/events.
- `engine/notebook-runtime.js`: a small facade over `WorldController` and the existing generation jobs. Drafts live on those jobs; WorldController remains the save/journal bridge.
- `engine/notebook-ui.js` and `engine/notebook.css`: notebook pages, review, direct controls and the discovery/response thoughts.
- `engine/world-object-renderer.js`: prepared notebook, kindling, water and torch recipes. The existing shared renderer draws them before actors; character code is unchanged.
- Existing `engine/runtime.js`, `engine/contracts.js`, and `server/generation-api.js`: narrowly scoped job-context, proposal, schema and prompt hooks. The teammate’s combat, quest rewards, generated regions and other generation contracts remain intact.

Generation requests capture the shared world identity and notebook revision, plus only notebook events observed by the player. Old drafts cannot be inscribed after a notebook change or into a different story. All effects recheck the current scene, reach, target and item availability. WorldSimulation’s existing transaction rolls back a failed multi-operation action, including notebook effects and emitted events. The same server generation concurrency/cache/budget owns these requests; no competing AI service or arbitrary JavaScript is introduced.

The notebook’s first adapter was archived in the local notebook-baseline work folder before adopting the newer teammate branch. That earlier isolated inventory is not installed. The Astra map/dungeon/NPC creation-tools branch is draft-generation infrastructure and does not supply this executable notebook interaction; its eventual installer is a separate integration.

## Camera and presentation

Selection and the visible-object list use the same logical coordinates as rendering, including the doubled canvas backing resolution and inn zoom. The inn’s centered contain sizing rejects clicks in empty letterbox bars. Other scenes preserve cover sizing and player anchoring. Existing native room furniture positions and collision are unchanged. The shared inn-chest entity retains interaction/selection without drawing a second miniature chest over the background furniture.

## Validation checkpoint

Fifteen focused notebook/API/camera tests pass (14 Node tests and one Vitest test). They cover physical discovery reach, use before/after a law, disabled/erased laws, actual shared pickup/drop ownership, transaction rollback, wetness, bounded definitions, explicit AI draft acceptance, stale/failing drafts, witnessed memory, shared save/journal persistence, API validation/cache reuse, desktop/phone camera mapping, and compatibility of newly created entities with the existing narrator actor-view contract. The 18 existing world-simulation tests and six existing viewport tests also pass with the adapter.

The integrated browser walkthrough passed at 1280 × 900 and 390 × 844: discovery thought, typing without movement/attacks, a visible created object, use before a law leaving the fire unchanged, law inscription, visible extinguishing with a factual thought/memory, pickup through the existing shared-world panel, and reload retaining the held object, law, and unlit tray. The notebook dialog has no horizontal overflow at phone width. Browser errors: zero. A second walkthrough used two explicitly mocked AI responses to verify Draft with AI → review → Inscribe for both pages and the resulting shared-world effect. These are authored/offline and fixture checks; no live notebook-provider success or latency is claimed. Screenshots are in docs/art/notebook-desktop.png, notebook-consequence.png, notebook-phone.png, and notebook-phone-world.png.

Run the focused suite with:

    node --import tsx --test engine/notebook.test.js engine/notebook-camera.test.js server/notebook-api.test.js
    node node_modules/vitest/vitest.mjs run server/notebook-world-api.test.ts

Current host preview command:

    node --env-file-if-exists=.env --import tsx node_modules/vite/bin/vite.js --configLoader native --host 127.0.0.1 --port 5174 --strictPort

## Repeatable walkthrough and remaining limits

Use ordinary controls to enter the inn, approach the table, discover the notebook, copy or generate water, and use it before a law. Verify the flame remains. Write and inscribe the extinguish law, use water again, and verify that the flame disappears and the factual thought/journal record appears. Pick up and drop the same item through the existing world panel, then reload and verify ownership, law and target status. Inspect the desktop and phone dialog, typing focus, camera-based selection, and ordinary combat/region controls after closing it. Run the merged repository’s full tests, typecheck and build before publication.

The first scope intentionally targets one tray in the hub inn. It does not add arbitrary item kinds, combat powers, generated raster assets, rules affecting every room, or notebook access inside generated-region inns. Normal portable-object actions remain owned by the shared simulation. The mobile world-action panel starts collapsed to leave the map visible; opening it is a player choice and is not automatically undone.
