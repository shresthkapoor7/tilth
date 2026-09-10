# Astra world creation tools

User steering supersedes the earlier awakenings/history plan. Build only tools for Astra to query Tilth's authored world and propose new maps, dungeons and NPCs. Outputs are validated, reviewable drafts; no live-world installation, combat changes, personality changes, new artwork generation, or creation UI is in this PR.

## Delivery

Branch: codex/astra-world-creation-tools, based on main 7991a5d. Keep Tilth's existing server, credentials, budget and production/Vite integration. Provide a callable HTTP authoring endpoint, exported tool registry, reusable validators, offline tests and an optional live smoke command. Open a PR after tests, build and independent review.

## Task 1: Authored-world catalog

Create engine/creation-catalog.js and engine/creation-catalog.test.js only. Export getWorldOverview(), getMap(mapId), getNpc(npcId), searchAssets(query, kind='all'). Queries must return detached JSON data describing authored content, never claim access to live browser state. getMap supports outpost and the three HOUSES interiors. Return names, coordinateSystem:'pixels', known static geometry and layout metadata plus explicit geometry limitations where render-time collision is not available. getNpc uses ACTORS and declares authored defaults, not current health/hostility. Searches expose actual reusable procedural asset recipes, not invented sprite URLs. Kinds: terrain, prop, character, all. IDs: terrain-stone, terrain-wall, terrain-water; prop-bed, prop-table, prop-chest, prop-hearth, prop-shelf, prop-anvil; character-warrior, character-mage, character-rogue, character-healer. Each asset has id, kind, name, description, tags, renderer (source module/export), and renderableInCurrentWorld (boolean). Mark conceptual terrain-water honestly if no reusable water renderer exists; do not imply everything is a generic callable renderer. Search case-insensitive by words, return at most 20, validate query type/length <=160 and kind; empty query lists all. Unknown map/NPC throws a useful error. Export a detached catalog listing via searchAssets('', 'all'). Test real queries, malformed inputs, honest provenance and no mutations leaking between queries. Test first. No subagents, no commits; root integrates and reviews.

## Task 2: Proposal contracts and tools

Root implements strict draft schemas and semantic validation for NPC definitions, tile-map blueprints and connected dungeon bundles. Bound map dimensions and list sizes; validate identifiers, tiles, reachable entrances/exits, collision-aware prop placement, existing asset references, NPC references and dungeon links. Draft tile coordinates are explicitly different from current authored pixel maps. Return structured error paths for repair. Expose query tools plus get_creation_capabilities, validate_proposal, propose_map, propose_dungeon and propose_npc. Proposal tools only collect validated drafts; no live mutation.

## Task 3: Model runner and HTTP

Expose GET /api/creation/tools and POST /api/creation/propose {id, kind:map|dungeon|npc, brief}. Use existing OPENAI_MODEL with documented gpt-6-astra configuration. Runner uses strict Responses function tools, preserves response items and call_id outputs, maximum 6 model responses, 24 tool calls, 90 seconds total. Reuse existing process-wide generation budget and concurrency lock; count each upstream call. Return exactly one final validated requested-kind proposal, status:'draft', applied:false, catalogVersion, tool names and retry-safe request caching; no partial drafts on failure. Same-origin checks and bounded request bodies. Existing generation endpoints unchanged. Human-readable docs and example script output reviewable JSON; no key printing.

## Task 4: Verify and publish

54 baseline tests pass with localhost permissions. Run all unit/server tests and build. Add real contract/HTTP integration tests with upstream-only fakes. Run offline end-to-end smoke; live smoke only if task-authorized credentials are available. Independently review diff and fix substantive findings. Fetch latest main, integrate if necessary, then push feature branch and open PR.
