# Astra map, dungeon and NPC proposal tools

Tilth exposes nine application tools for reading authored world content and proposing new content. A proposal is **a validated draft for review, not an installed map or a spawned NPC**. Existing gameplay, combat, saves and awakening generation remain separate.

## Run

```sh
npm ci
npm test
npm run build
npm run creation:smoke
```

The default smoke uses explicit test fixtures and no model credentials. It exercises the production HTTP server, a catalog query, an invalid proposal, a repair and a final connected dungeon draft. To check the other proposal types:

```sh
npm run creation:smoke -- --kind map
npm run creation:smoke -- --kind npc
npm run test:creation-smoke
```

For a live Astra run, configure server-only `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-6-astra` in `.env`, then run:

```sh
npm run creation:smoke -- --live --kind dungeon --brief 'A flooded volcanic archive with two connected chambers and a wary archivist.'
```

Live mode makes billable model requests and prints the resulting JSON draft. Missing credentials or model errors are reported; live mode never falls back to fixtures. The smoke command starts and closes its own temporary localhost server. To use a persistent server, run `npm run dev` or build and run `npm start`.

## HTTP interface

Both Vite and the production server expose the same routes through the existing generation middleware.

`GET /api/creation/tools` returns `{catalogVersion, capabilities, tools}`. It works without a model key and makes no provider call. `tools` contains strict Responses API function definitions.

`POST /api/creation/propose` accepts:

```json
{
  "id": "my-dungeon-draft-1",
  "kind": "dungeon",
  "brief": "Two connected rooms in an abandoned volcanic library, with a friendly guide."
}
```

`kind` is `map`, `dungeon` or `npc`. `brief` is nonblank text up to 3,000 characters. `id` is a caller-generated string of 1–100 characters. Request bodies are limited to 24 KB.

Successful output contains:

```json
{
  "status": "draft",
  "applied": false,
  "catalogVersion": 1,
  "proposal": {"kind": "dungeon", "notes": "...", "npcs": [], "dungeon": {}},
  "toolsUsed": ["get_creation_capabilities", "get_world_overview", "propose_dungeon"]
}
```

The shortened `proposal` above illustrates the envelope; use the tool manifest for the full required schema. Exact successful request retries return a cached draft without another model call. Reusing an ID with a different kind or brief returns a conflict. The cache retains at most 100 results for the server process lifetime; it is not durable storage. Save the returned JSON in the consuming application if it must survive a restart.

## Available tools

| Tool | Purpose |
| --- | --- |
| `get_world_overview` | List authored map and NPC IDs and available asset categories. |
| `get_map` | Inspect `outpost`, `inn`, `smith` or `home`, including known geometry and its limitations. |
| `get_npc` | Read an authored NPC's appearance, equipment, personality and spawn defaults. |
| `search_assets` | Find existing procedural terrain, prop and character recipes by words and category. |
| `get_creation_capabilities` | Read draft coordinate rules, supported terrain and size limits. |
| `validate_proposal` | Validate a complete draft and return error paths without submitting it. |
| `propose_map` | Submit a map blueprint with its new NPC definitions. |
| `propose_dungeon` | Submit connected map blueprints and their new NPC definitions. |
| `propose_npc` | Submit a standalone new NPC definition. |

The server runs these tools in response to Astra function calls. Tool errors are returned to Astra for repair. A valid requested-kind proposal finishes the request. Narrative text alone is never accepted as a proposal.

Other application callers can reuse the same definitions and dispatcher directly:

```js
import {getCreationTools, executeCreationTool} from './server/creation-tools.js';

const definitions = getCreationTools();
const map = executeCreationTool('get_map', {mapId: 'inn'});
const assets = executeCreationTool('search_assets', {query: 'chest', kind: 'prop'});
```

These functions need no API key. They return detached data and cannot modify Tilth's world. Provider calls remain owned by the existing server generation service. The implementation follows the [Responses function-calling flow](https://developers.openai.com/api/docs/guides/function-calling).

## Draft contracts

- All proposals contain `kind` and review `notes`. Unknown fields and executable-code fields are rejected.
- NPC definitions contain a new ID, name, description, role, weapon, HP, personality, opening line, disposition and a catalog character appearance ID. No NPC is placed until an eventual installer consumes the draft.
- Map blueprints use an **8–40 column by 8–30 row tile grid**, with x increasing right and y increasing down. This is distinct from the existing world's 800 × 600 pixel canvas. `#` is blocked wall, `.` is walkable floor and `~` is blocked water. All boundary cells must be walls.
- Each map defines an entrance, 1–4 named exits, props and NPC placements. Entrance, exits, props and NPCs occupy distinct floor cells. A prop occupies one draft tile; its `blocking` flag participates in reachability validation. A future installer must account for actual sprite/collider dimensions.
- Exits and NPCs must be reachable from the entrance; props must be approachable. Blocking props are included in path checks.
- A map proposal includes the definitions for its placed NPCs. A dungeon contains 1–8 maps, an entry map, bidirectional exit connections and up to 32 new NPC definitions. Every map must be reachable through the connection graph. Connection endpoints must exist and cannot be reused. Unconnected exits remain proposed frontier exits; no destination is invented for them.
- New map/NPC IDs cannot overwrite authored identities. Each NPC definition is placed exactly once across a map/dungeon proposal. Asset and NPC references must resolve.

Validation errors identify `path`, `code` and `message`. The exported `validateProposal()` is reusable by future preview and installation code, so they can share the same contract.

## Boundaries and integration

Queries describe source-authored defaults, not live browser state. For example, `get_npc` does not know whether the player has injured that NPC. Outpost rocks, trees and other colliders currently register during rendering; map queries explicitly flag that the static geometry is incomplete.

The asset catalog identifies real renderer recipes and their source exports. Interior furniture is rendered inside `drawInterior`, not through standalone prop functions. Water is marked conceptual because the current renderer has no reusable water implementation. No external asset URLs, new image generation or renderer-code generation are introduced.

Creation requests share the existing generation service's concurrency lock and `OPENAI_MAX_GENERATIONS` budget. Each upstream call counts, including failed attempts. A job is limited to six model responses, 24 tool calls and 90 seconds total. Errors and exhausted limits return no partial draft. Model keys and provider transcripts are not returned to the client.

The next integration can add a map preview and explicit installation flow using these drafts. Installing tile geometry, translating coordinates, spawning NPCs, applying collision and persisting playable scenes are intentionally outside this tools-only change.

## Draft checkpoint status

The checkpoint passes all 90 repository tests, the production build and both smoke CLI tests. The offline smoke exercises the production HTTP API with a fixture provider, including a rejected proposal followed by a repair. Live Astra validation has not run because model credentials were unavailable.

Before this draft is ready to merge:

- Resolve the review finding about model-facing strict-schema keyword compatibility and verify the tool loop against the configured Astra model.
- Protect the exported proposal schemas against nested mutation so callers cannot alter later validation.
- Correct duplicate dungeon map ID error paths to identify `$.dungeon.maps[i].id`.
- Complete independent review of the transport, including cancellation behavior after a request deadline.
