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


## Dice and journal polish

- Return to the solo world’s brass-framed menus and compact action bar; keep chat and long narration in an on-demand chronicle.
- Add an explicit foreground d20 action confirmation, synchronized server results, and an automatic guard result.
- Add player journals for class moves, current resources, reachable targets, and each player’s own resolved actions.
- Describe movement in steps, with a clear next action when movement is exhausted.
- Verify duplicate actions, invalid rulings, history ownership, two-client results, keyboard operation, and small-screen layouts.

Validation: 95 tests and the production build pass. Browser checks exercised four-player desktop/mobile HUDs, cancellation before rolling, a shared natural-20 result, separate histories, journal shortcuts and landscape layouts without browser errors. A live two-player Astra encounter also produced the same d20 4 + 4 versus armor 14 miss on both clients and recorded the generated narration in the acting player's journal.


## Exploration and world graphics correction

- Opening scenes now have three generated residents, named homes and accepted delivery/clearing/investigation requests. The first chapter has no enemies; dragons belong to chapter three.
- Exploration permits every player to move without combat initiative. Nearby threats or an attack begin combat; defeating them restores exploration.
- Early chapters advance through completed requests. Delivery checks the correct recipient and return; clearing removes a collidable object after a successful check.
- Replace sparse environment art with detailed houses, tiled roofs, windows, rich foliage, stonework and readable props. Sort sprites and scenery by depth and fade foliage around characters.
- Put actions and dice beside the map and focus the camera inside the remaining clear space. Shrink the persistent HUD and keep longer text in requested panels.
- Validation: 101 tests pass, including reachability for all 20 theme/layout pairs. Two-browser checks covered shared requests and d20 clearing; a live Astra call produced Fernbell Village with three distinct noncombat requests and no enemies. The production build passes.
