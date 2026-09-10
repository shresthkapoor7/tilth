# Tilth · The living table

A cooperative pixel-art adventure for **1–4 players**, with **GPT-6 Astra as dungeon master**. Built on branch `d&d` using Tilth’s existing landscapes, character sprites and in-world UI.

Create a room, share its code, gather your companions, and describe the expedition you want. Astra creates a three-chapter adventure, interprets improvised actions, and narrates server-controlled dice rolls. The first chapter is a peaceful settlement with generated residents and practical requests. Later chapters introduce danger; dragons are reserved for the finale, even when the opening wish mentions one.

## What you can do

- Join a room as a Warrior, Mage, Rogue or Healer. Each has distinct HP, attack range, weapon and healing charges.
- See the same party, scene, health, turn order, narration and chat from separate browsers.
- Move, attack, heal, guard, inspect landmarks, or describe an action such as “I distract the dragon with a song.”
- Bring a compact d20 tray into the foreground, press **Roll d20**, and see the same server-generated die, bonus, target and outcome across the whole party. Guard succeeds automatically.
- Open a personal journal for any party member: class moves, remaining healing charges, reachable targets, and their last 32 resolved actions and outcomes.
- Play through a compact action bar and the original brass-framed menus, with the map filling the screen. Contextual tools and dice sit along the edge; a following camera keeps the traveler clear of them, including on mobile. The longer dungeon-master chronicle and party chat open on demand.
- Fight animated dragons, goblins, skeletons and slimes. Dragons flap their wings and breathe fire; action effects and floating numbers show shared outcomes.
- Speak to residents, accept their requests, deliver a parcel to another person, clear an obstruction, or investigate a clue. Return to the requester to finish. All players share accepted requests and parcel progress; the party journal gives the next destination. Completing the requests advances chapters one and two. The final chapter requires defeating its threats and securing a landmark relic.
- Explore detailed settlements with brickwork, tiled roofs, warm windows, unarmed residents, fuller foliage, wells and task props. Objects and characters draw in depth order; foreground foliage fades when it would hide your traveler.
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

**Exploration is free:** every player can move without waiting for initiative. Turns begin when you approach or attack an enemy, and end when the threats are defeated. In combat, each player gets **one minute to move freely and take one action**. A shared countdown passes the turn automatically at zero; taking an action or choosing End turn passes it early. The clock pauses while the AI resolves an action. Use WASD/arrows, choose Move and click nearby ground, or use the touch direction buttons. Walls and terrain block movement. Attack and inspect targets must be in range; walls also block attacks.

Use **1–6** for attack, heal, guard, inspect, move and improvise. Choose a target on the map or in the selector, then press **Roll d20** to commit the action. Closing the dice tray before rolling cancels without spending a turn or making an AI call. Once rolled, closing the tray lets you return to the map while the ruling finishes. **Enter** ends your combat turn. **F** speaks to a nearby resident. Their conversation panel offers acceptance, delivery and completion buttons when applicable.

Press **J** or click a party portrait to open that player’s journal. “Possible moves” explains real class abilities and current restrictions; “My journey” records only that player’s resolved actions, rolls and narration. “Party quests” lists shared requests, the next step, and the direction and approximate distance to the person or object you need. **C** opens the full chronicle and party chat; **Esc** closes an open menu or opens the room menu. Journals share the room’s in-memory lifetime and survive browser reloads, not server restarts.

Improvised actions go to Astra, which returns a bounded ruling. The server chooses the success/failure narration using its own d20 roll and class bonus, then applies the actual effect. Guard blocks part of the next incoming hit; healing uses a limited chapter charge.

Enemies act after a combat round. Fallen players do not act. In the first two chapters, requests provide progression; fighting is not the only objective. The final chapter requires defeating its enemies and securing a relic. Surviving and fallen companions recover 12 HP, up to their maximum, when the host advances to the next chapter. A full-party defeat ends the expedition.

This uses a lightweight custom ruleset inspired by tabletop play, not the complete D&D rules. Free-form ideas must resolve through attack, heal, guard, interact or talk. The model cannot grant arbitrary powers, damage, extra turns or invented victory conditions.

## Multiplayer architecture

- `server/dungeon-api.js`: room creation/joining, authorization and action endpoints.
- `server/dungeon-rooms.js`: authoritative membership, capacity, initiative, dice, HP, movement and encounter progression.
- `server/dungeon-master.js`: server-only Astra calls with strict scene/ruling contracts.
- `dungeon/main.js`: shared UI and short-interval state synchronization.
- `dungeon/art.js`: procedural creature sprites and action effects, reusing Tilth’s player and landscape renderer.

Each seat has a private session token. Tokens never appear in the public room snapshot. Concurrent actions are serialized; repeated action IDs cannot consume another turn. Invalid or failed AI responses leave the turn available to retry. Chat does not spend turns or call the model. Resident names, greetings, homes, errands and thanks are generated with the chapter. Accepting or delivering a request uses its already-generated content; skill checks and free-form questions request a new ruling. Existing rooms retain their chapter content; create a new room to experience the settlement opening.

Rooms are **in memory on one server process**. Browser reloads preserve the seat through session storage; a server restart/redeploy ends active rooms. Use **one Railway replica** for this version. Empty rooms are removed; abandoned rooms expire after two hours. This version has no accounts, durable campaign storage, cross-server room routing, or voice chat.

## Build and deploy

```sh
npm test
npm run build
npm start
```

The production server serves both frontends and their APIs on `PORT` (3000 by default). The existing Railway build/start configuration remains valid. Set the environment variables in Railway and deploy this branch when ready. Never expose the key through a `VITE_` variable.

## Validation

Dice and journal tests cover shared authoritative results, duplicate submission, failed rulings, automatic guarding, per-player history, real resources and target eligibility. Browser checks also cover four-player layouts, click-to-roll and cancellation, synchronized results in two clients, journal switching, keyboard access, and mobile/landscape layouts.

Room tests cover capacity, private tokens, host permissions, concurrent and repeated actions, bad AI rulings, movement bounds, turn passing, reconnect, health/damage, chapter completion and independent HTTP clients. Browser checks used two separate clients sharing one live Astra-created dragon encounter, an improvised guard, enemy fire damage and a narrated attack roll.

See [dungeon/PLAN.md](dungeon/PLAN.md) for the implementation outline.

Settlement validation covers safe arrivals, shared acceptance/delivery/return, actionable clearing with real obstacle removal, later combat transitions, reachability across all biome/layout combinations, and camera placement around controls. A live Astra call created Fernbell Village with three residents and delivery, clearing and investigation requests, with no enemies at arrival.
