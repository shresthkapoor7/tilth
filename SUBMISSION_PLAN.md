# Tilth · Astra submission plan

The demo centers on a wish with consequences: act in the world, record what happened, ask the witch for something, and explore her interpretation.

1. **Playable errands.** Astra composes accepted quests from pushing a rock, clearing debris, collecting/delivering a parcel to a named resident, and fighting patrols. Place every target on a reachable route; persist progress and award an awakening only after completion and report-back.
2. **Consequences with evidence.** Pass helpful acts and violence to the witch. Her response cites actual actions and selects a supported, visible consequence. Never invent theft, kills, or wealth the game does not track.
3. **Submission UI.** Remove staged party/boss screens, cosmetic rally, fake inventory rewards and currency/level/mana indicators. Keep character creation, quests, journal, awakenings, combat help, sound, and one contextual interaction key.
4. **Latency.** Prefetch one witch greeting near an unexplored edge with snapshot invalidation, cancellation and a cooldown. Generate the region only after receiving the wish. Cache revisits. Do not advertise instant generation or replay canned output as live Astra.
5. **Game feel and voice.** Add bounded impact particles, heavy-hit pause and shake, plus witch spell feedback. Respect reduced motion. Optional browser narration reads generated text; it is not Astra audio.
6. **Submission evidence.** Switch the default to GPT-6 Astra, validate one live region, exercise tasks and save/reload, run tests/build, and write a 90-second demo script that includes the real generation wait.

## Acceptance checks

- Declining/postponing a quest grants no progress reward; accepting and reporting back grants one.
- Delivery requires collecting the correct parcel and meeting the named recipient at the specified house.
- Moving/clearing a prop visibly changes the world and is saved. Unknown targets cannot grant progress.
- Every task target and house can be reached across all supported layouts.
- Witch judgments reference supplied journal evidence; hostile mechanics require recorded wrongdoing.
- No secret is included in client code, screenshots, docs, or commits.
- Existing saves remain readable. Deployment and pushing are separate from local implementation.

## Local implementation status

- [x] Accepted errand contracts, props, collision, parcel inventory, recipients, saved progress.
- [x] Evidence-grounded witch consequences: ember footsteps and wider patrol detection.
- [x] Removed staged boss/party screens, cosmetic rally and fabricated HUD values; retained functional satchel. Moved hub patrols away from the initial spawn to let players orient themselves.
- [x] Greeting prefetch with matching evidence, cooldown and cancellation. Wish-dependent region generation remains explicit.
- [x] Impact particles, heavy-hit pause/shake, reduced-motion support and optional browser narration.
- [x] Astra configuration, rewritten README and honest 90-second demo route.
- [x] Browser flow: accept, push, clear, collect, enter the recipient house, deliver; original save restored.
- [x] Automated task, persistence, collision, consequence, prefetch and existing regression tests (82 passing).
- [x] Live GPT-6 Astra region validated: Fernwake generated in 26.5 seconds with pushing, clearing, and delivery tasks. All task approaches and house entrances are reachable. Earlier timeout/incomplete responses led to a shorter region-specific prompt and a larger response budget.

The 90-second route is a presentation target, not a latency guarantee. New regions may take longer, and the demo must identify saved versus live content.
