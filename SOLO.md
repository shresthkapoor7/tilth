# Tilth

**A wish remembers its maker.**

Tilth is a single-player pixel RPG built around a boundary witch. Tell her what lies beyond the map. GPT-6 Astra interprets your wish alongside your recorded actions, then designs a traversable region with named residents, enemies, errands, and a judgment you can play through.

Help someone and she has evidence of kindness. Strike a resident and your wish may come back twisted: footsteps that kindle into embers, or patrols that notice you from farther away. Her words cite actual events. She can choose mercy; the engine never assumes that exploration or ordinary combat makes you evil.

## Play

- Create a traveler with a name, appearance, class, and sword, spear, bow, or staff. Describe an idea or ask AI for a character.
- Explore Cinderwatch and walk to a boundary to meet the witch. Ask for a place, atmosphere, or activity.
- Meet residents inside furnished houses and accept their quests. Astra can combine moving a boulder, clearing debris, collecting and delivering supplies, and defeating patrols.
- Follow the objective marker. **F** interacts with objects or talks to a nearby resident. A delivery needs the correct parcel and recipient; carried parcels appear in your satchel.
- Return to a resident after completing the tasks. Each regional quest restores health and grants one generated awakening offer with a new combat move and combo. Accepting an awakening replaces the previous one; declining keeps it.
- Explore another edge. Regions, tasks, parcel inventory, defeated enemies, quests, and awakenings are saved in your browser.

The authored starter village and previously generated quests remain compatible with older saves. Newly generated regions use the richer errand contract; existing accepted quests retain their original objectives.

## Astra and the engine

Astra generates character details, witch dialogue, region designs, names, task combinations and descriptions, evidence-based consequences, awakening move definitions, and journal reflections. Responses use a strict JSON schema and are validated before the game applies them.

The engine owns movement, collision, reachable paths, sprites and effect primitives, task interactions, inventory, combat damage, and completion checks. It executes bounded data; it does not run arbitrary generated JavaScript. A model-written promise cannot grant an unsupported ability or reward.

The witch receives a bounded journal snapshot including helpful errands, attacks on residents, completed quests, and exploration. Hostile consequences require a cited resident hit. She cannot invent stolen gold, dead relatives, or a trading system.

## Run locally

```sh
npm install
cp .env.example .env
# Add your server-side OPENAI_API_KEY to .env.
npm run dev
```

Open **http://localhost:5173/**. Configure:

```dotenv
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-6-astra
OPENAI_REASONING_EFFORT=low
OPENAI_MAX_GENERATIONS=20
```

The key stays on the server. Never put it in a `VITE_` variable. Astra supports Structured Outputs and low reasoning effort; see the [official model documentation](https://developers.openai.com/api/docs/models/gpt-6-astra). Local `.env` settings do not update Railway variables automatically.

```sh
npm test
npm run build
npm start
```

`npm start` serves `dist` and the API together on `PORT` (3000 by default). Production reads environment variables supplied by the host; for a local production check with a dotenv file, use `node --env-file=.env server/start.js` after building.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| F | Talk, move a rock, clear debris, collect or deliver a parcel |
| Space / 1 | Weapon attack |
| Q / E / R | Weapon-specific heavy, spin, and special attacks |
| Shift | Dodge |
| 2 | Brief guard |
| 4 | Restore 40 HP, with an eight-second cooldown |
| 5 | Accepted awakening move |
| T / J / I | Quests / journal / satchel |
| C / U / K | Character / awakenings / combo guide |
| Esc | Menu |

Touch movement and combat buttons are available on small screens. Floating damage, impact particles, brief heavy-hit pause and shake provide combat feedback; reduced-motion preferences disable shake and hit pause. The witch has an optional **Read aloud** toggle using browser speech synthesis. It reads generated text and is not Astra-generated audio; voice availability varies by device.

## Generation and persistence

Approaching an unexplored edge may prefetch one witch greeting, throttled to once per 45 seconds. The greeting is reused only when its destination and journal snapshot match. The region is generated **after** the actual wish; loading animation stays visible until validation succeeds. Revisiting an existing region makes no API request. Nothing promises zero-latency generation.

Up to 16 regions are stored locally. Reloading starts at Cinderwatch while retaining the world and progression. Surviving enemy HP is session-local; defeated regional enemies stay defeated. Parcels and completed task props remain saved. A quest must be accepted and reported back before its reward can be claimed, and each reward is issued once.

API requests are cached and limited per server process. Failures show a retry path without replacing the map. Without an API key the authored village remains playable, but new AI content is unavailable. This submission does not include multiplayer, accounts, cloud saves, arbitrary art/code generation, or a trading economy. Local save events are appropriate for this single-player prototype, not authoritative multiplayer anti-cheat.

## Railway

Use build command `npm run build`, start command `npm start`, and health check `/api/generation/status` as defined in `railway.json`. Add the four environment variables above to Railway, including `OPENAI_MODEL=gpt-6-astra`. A static file server cannot handle `POST /api/generation`.

See [SUBMISSION_PLAN.md](SUBMISSION_PLAN.md) for the polish checklist and [DEMO.md](DEMO.md) for the presentation route.
