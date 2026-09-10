# Tilth: the living table

Build a four-player, D&D-inspired cooperative adventure on branch `d&d`, preserving the solo game at `/solo.html`.

- Room-code lobby with server-enforced four-player capacity, host start, per-player session tokens and reconnect.
- Server-owned turn order, d20 checks, health, movement, enemy retaliation, shared relics and a three-chapter campaign.
- Astra creates encounters and adjudicates improvised actions through a bounded contract; the server applies dice and effects.
- Shared pixel canvas, party HUD, narration panel, targets and actions; responsive keyboard/touch controls.
- Procedural animated dragons, skeletons, goblins and slimes alongside existing player sprites and landscapes.
- Validate admission, authorization, simultaneous actions, deduplication, reconnect, combat and two-browser synchronization. Verify live Astra generation.

Rooms are held in one server process for this version. Reloading a browser restores its seat; restarting the server ends the room. Run one Railway replica. This is a custom lightweight ruleset, not a full implementation of tabletop D&D rules.

## Completed validation

- Four seats, host permissions, session secrecy, late-join rejection, reconnect and host transfer.
- Shared chat/state through independent HTTP clients and two separate browser tabs.
- Concurrent-command rejection, idempotent action IDs, failed-ruling recovery and server-owned damage.
- Movement limits, connected-tile pursuit, guarded retaliation, relic requirements and three-chapter completion.
- Live Astra: generated The Verdant Sanctuary with a dragon; interpreted a player's ward as guard; narrated a failed attack according to the server's d20 result and preceding fire damage.
- Existing solo checks plus multiplayer tests: 91 passing. Both frontend entry points build successfully.

Run `npm run dev`, create a room at `/`, then join from another browser/tab before the host starts. The branch is local until explicitly pushed.
