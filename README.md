# Tilth · The living table

A cooperative pixel-art adventure for **1–4 players**, with **GPT-6 Astra as dungeon master**. Built on branch `d&d` using Tilth’s existing landscapes, character sprites and in-world UI.

Create a room, share its code, gather your companions, and describe the expedition you want. Astra creates a three-chapter adventure, interprets improvised actions, and narrates the outcome of server-controlled dice rolls. The final chapter includes a dragon; you can also request one in the opening wish.

## What you can do

- Join a room as a Warrior, Mage, Rogue or Healer. Each has distinct HP, attack range, weapon and healing charges.
- See the same party, scene, health, turn order, narration and chat from separate browsers.
- Move, attack, heal, guard, inspect landmarks, or describe an action such as “I distract the dragon with a song.”
- Fight animated dragons, goblins, skeletons and slimes. Dragons flap their wings and breathe fire; action effects and floating numbers show shared outcomes.
- Defeat the threats and secure a landmark relic to complete a chapter. The host can then lead the party onward. Finishing chapter three wins the expedition.
- Reload the same tab to reconnect to your seat. Leave explicitly to release it; the host role transfers if needed. Disconnected turns can pass to an online survivor after a minute.

The original single-player adventure remains at **[/solo.html](/solo.html)**. See [SOLO.md](SOLO.md) for its controls and features.

## Play locally

```sh
npm install
cp .env.example .env
# Add the server-side OpenAI key to .env.
npm run dev
```

Open **http://localhost:5173/**. Create a room, then join its six-character code from a second tab or another device. For another device on your local network, open the host computer’s LAN address on port 5173 rather than `localhost`. Invite links use whichever address you opened.

```dotenv
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-6-astra
OPENAI_REASONING_EFFORT=low
DM_MAX_GENERATIONS=60
```

Gather the party **before** the host presses **Begin the adventure**. Late joins are disabled once a campaign starts. Capacity is enforced by the server. A room can be played alone for testing, or with up to three companions.

## Turns and controls

Each player gets **100 pixels of movement and one action per turn**. Use WASD/arrows, choose Move and click nearby ground, or use the touch direction buttons. Walls and terrain block movement. Attack and inspect targets must be in range; walls also block attacks.

Choose an action and click its target on the canvas, or use the target selector. Healing can also target a player from the party list. Improvised actions go to Astra, which returns a bounded ruling. The server chooses the success/failure narration using its own d20 roll and class bonus, then applies the actual effect. Guard blocks part of the next incoming hit; healing uses a limited chapter charge.

Enemies act after a party round. Fallen players do not act; chapters require defeating every enemy and securing at least one relic. Surviving and fallen companions recover 12 HP, up to their maximum, when the host advances to the next chapter. A full-party defeat ends the expedition.

This uses a lightweight custom ruleset inspired by tabletop play, not the complete D&D rules. Free-form ideas must resolve through attack, heal, guard, interact or talk. The model cannot grant arbitrary powers, damage, extra turns or invented victory conditions.

## Multiplayer architecture

- `server/dungeon-api.js`: room creation/joining, authorization and action endpoints.
- `server/dungeon-rooms.js`: authoritative membership, capacity, initiative, dice, HP, movement and encounter progression.
- `server/dungeon-master.js`: server-only Astra calls with strict scene/ruling contracts.
- `dungeon/main.js`: shared UI and short-interval state synchronization.
- `dungeon/art.js`: procedural creature sprites and action effects, reusing Tilth’s player and landscape renderer.

Each seat has a private session token. Tokens never appear in the public room snapshot. Concurrent actions are serialized; repeated action IDs cannot consume another turn. Invalid or failed AI responses leave the turn available to retry. Chat does not spend turns or call the model.

Rooms are **in memory on one server process**. Browser reloads preserve the seat through session storage; a server restart/redeploy ends active rooms. Use **one Railway replica** for this version. Empty rooms are removed; abandoned rooms expire after two hours. This version has no accounts, durable campaign storage, cross-server room routing, or voice chat.

## Build and deploy

```sh
npm test
npm run build
npm start
```

The production server serves both frontends and their APIs on `PORT` (3000 by default). The existing Railway build/start configuration remains valid. Set the environment variables in Railway and deploy this branch when ready. Never expose the key through a `VITE_` variable.

## Validation

Room tests cover capacity, private tokens, host permissions, concurrent and repeated actions, bad AI rulings, movement bounds, turn passing, reconnect, health/damage, chapter completion and independent HTTP clients. Browser checks used two separate clients sharing one live Astra-created dragon encounter, an improvised guard, enemy fire damage and a narrated attack roll.

See [dungeon/PLAN.md](dungeon/PLAN.md) for the implementation outline.
