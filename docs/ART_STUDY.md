# Playable illustrated inn

10 September 2026. A bounded proof of the [art-port proposal](ART_PORT.md), implemented on `codex/tilth-integration`.

## Try it

Run the existing Vite development server, then open `http://127.0.0.1:5174/?art=ink` on this host. The link enters The Ember Rest through the shared room-entry handler. An **Art study** button in the village opens the same room. First-time players still use Tilth's character creator.

- Use **Ink / Pixel** to compare the same room at the same player position.
- Use **Drawn avatar / Saved avatar** to compare the prepared outfit with the saved character's actual appearance. The study does not overwrite the profile.
- Hold WASD/arrows to walk continuously inside the inn. Walk around the table to see front/behind compositing. Other rooms and the village retain their existing movement behavior.
- Space, Q, E, R and Shift still invoke Tilth's weapon actions and combos. T opens existing quests; the bottom doorway returns to the village.

## Implemented boundary

The inn's existing furnishing records own every collision footprint. Drawing placement uses the same widths and ground-contact lines, with separate illustration height. Props and the actor are ordered by their ground position. The illustrated shell is cached; the main Canvas uses a sharper backing resolution and the same 800 by 600 logical coordinates. Both comparison modes use the same closer inn framing.

Eight prepared PNGs supply furniture, a portrait and four directional animation sheets. They load once when the study is requested or the inn is entered; ordinary village startup does not fetch them. Alpha and crop inspection happen during loading, not each rendered frame. Asset failures leave the original pixel room available. No model call is required for walking, turning or drawing these assets.

The study reuses Tilth's runtime, profile, event ledger, quests, generation queue, room transitions, input actions and sound. A normal inn entry is recorded and may advance an accepted visit objective under the existing rules. Switching presentation or avatar does not record a gameplay event. Outdoor collision construction still belongs to the original renderer; this interior proof does not replace that renderer or require the broader extraction proposed in ART_PORT.

## Verified

- All 45 tests pass, including four new checks for footprint registration, actor/prop overlap order, continuous movement against the actual inn furniture, bounded input time and prepared animation-frame selection.
- Modern unminified Vite build passes with the existing Windows host workaround.
- Browser walkthrough at 1280 by 720: loaded the illustrated room; saw the real first-visit thought with the drawn portrait; moved to the table's collision edge; switched Ink/Pixel at the same position; restored the saved customized avatar; walked around the furniture and behind the table; executed a recognized Cinder Cleave with the saved bow; exited through the normal doorway into the original village; reloaded the study successfully.

No frame-rate or network-latency benchmark is claimed. Source sheets are intentionally retained at their current quality and size for the proof; shipping-size optimization is pending.

## Limits of this proof

The illustrated avatar has one prepared outfit. The saved avatar switch preserves all existing visual customization. Weapon effects and attack body motion reuse Tilth's procedural implementation; this is not a complete set of drawn combat poses. The original cast, other interiors, village, creator previews and awakening/battle screens are not fully reskinned. The low cupboard stands in for the inn's storage prop. Further camera, framing, animation and alpha-edge polish remains; mobile-specific visual validation has not been completed.

Next: choose whether this visual result is strong enough to extend, then build a registered modular character/weapon set and a coherent Tilth-specific prop set. Preserve the pixel renderer as a fallback while coverage grows.
