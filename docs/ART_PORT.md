# Hand-drawn presentation for Tilth

10 September 2026. Architecture review of the local integration branch at `a4c1a90`. The full port remains a proposal. A subsequent [playable illustrated inn](ART_STUDY.md) now demonstrates a bounded portion. Hayden asked whether Notebook World's drawing style can transfer while retaining Tilth's other elements.

## Recommendation

Keep Tilth as the game and add a selectable presentation layer. Its existing Canvas 2D renderer can display prepared raster artwork; a 3D engine or framework migration is unnecessary for the requested screen-aligned elevated view. Preserve Cinderwatch, its cast, room identities and gameplay. Transfer the drawing language rather than replacing the village with Notebook World's bedroom.

The hackathon path is illustrated dialogue/encounter portraits first, followed by a coherent single-interior experiment with a matching character. Keep the complete pixel presentation available while the illustrated version gains coverage. A proof with one fixed protagonist does not establish compatibility with every character-creator option.

## What currently draws the game

| Surface | Current implementation | Illustrated equivalent |
| --- | --- | --- |
| Village | `volcanic.js`: rectangles, polygons, deterministic ground detail, light gradients; cached to an 800 by 600 offscreen canvas in `main.js` | Prepared environment layers and anchored prop images, with cached static composition |
| Interiors | `interiors.js`: draws walls, floors and furniture from `world.js` furnishing records | Room shell and separate furniture drawings using those same records |
| Actors | `volcanic.js:drawHero`: palette-based shapes, separate legs/arms/cloak, directional faces | Layered drawn character parts and registered animation frames |
| Movement and attacks | Time-driven leg stride/body transforms; `attack-pose.js`, `weapon-renderer.js`, `combat-visuals.js` | Drawn frames and weapon/effect artwork driven by existing action progress and cooldowns |
| Atmosphere and awakened skills | Programmatic embers, glow, particles and bounded effect data | Reusable ink marks, flame frames and drawn effect stamps on the same trajectories |
| Menus, dialogue and HUD | HTML/CSS with small Canvas character previews | Retain the controls and behavior; change typography, panel decoration and portrait rendering |

The live model currently generates validated JSON, including colored rectangle attachments and effect parameters. It does not generate raster game frames. Prepared illustrated assets should also require no model calls during movement or attacks.

## Necessary architecture work

1. **Separate collision construction from drawing.** `drawVolcanic` currently clears and repopulates the outdoor obstacle list through drawing helpers such as `rock`, `fortress` and `brazier`. Extract scenery records/geometry into a shared world registry. Both art styles must consume it; switching styles must neither remove obstacles nor duplicate them. Interior furniture already shares a geometry registry.
2. **Introduce drawing adapters at every surface.** Route world, actor, portrait and effect drawing through the selected presentation. Cover dialogue, the creator, HUD, awakening preview and battle preview as well as exploration. Keep positions, room transitions, profiles, events, quests, saves and generation jobs owned by the existing game.
3. **Give assets explicit registration.** Store source/frame rectangles, display scale, ground-contact anchor, facing and draw depth separately from collision footprints. Generate against Tilth's actual layout scaffold. A PNG's transparent padding must never determine physical size. Verify real alpha; reject opaque fake checkerboards.
4. **Split backgrounds from foreground occluders.** Tall props and actors need a ground-position draw order, with foreground pieces for doors/roofs where needed. Today much scenery is flattened into the background and the player is painted afterward. More detailed illustrations will make incorrect overlap more visible.
5. **Decouple display resolution and animation cadence.** Preserve the 800 by 600 logical coordinates while using a sharper backing canvas and appropriate image filtering for line art. Cache static layers. Smooth travel and a held drawn pose are separate: interpolate movement each display frame, advance walk drawings by distance, and select attack drawings from existing action progress. Tilth's current key movement advances in 12-pixel steps, and its ambient redraw path is throttled; an art swap alone does not deliver smoother controls.

## Preserving customization and generation

The creator has five hairstyles, four clothing types, configurable colors and four weapons. A single finished sprite sheet cannot represent all of them. Use registered body/hair/clothing layers, tint masks that preserve ink/hatching, weapon attachment points and matching action poses. Reuse these across world and preview renderers. The four existing Notebook World walk sheets are useful to prototype frame selection and ground registration, but depict one fixed outfit and contain no matching Tilth weapon-action set. Their art and turn registration still need review at Tilth's smaller world scale.

Custom `characterArt` and awakening `appearance` are arbitrary rectangle lists under the current contracts. A different base character does not automatically make those decorations hand-drawn. An illustrated renderer could interpret them as textured ink shapes, but quality must be checked. A later accessory-catalog schema would provide more art control while changing what the generator can express. That is a separate product choice and requires compatibility for saved definitions. Keep the current renderer as a fallback; do not silently discard old attachments or substitute a fixed portrait for a customized hero.

## Art direction and scope

Use strong, slightly irregular indigo contours, selective pencil hatching, quiet faces and broad surfaces, flat color and a few saturated accents. Retain the volcanic setting: spare ash-colored ground, charcoal rock masses, warm ember accents and simplified structural marks. Buildings and furniture must retain coherent perspective and door alignment. Avoid applying uniform paper noise to every surface; it does not create the requested drawing language.

For the first proof, use one complete interior composition with one character walking, turning and demonstrating each weapon family; check near/far furniture overlap and the existing exit. Portrait-only work can ship earlier while the village remains pixel art. Extend the full presentation only after the proof establishes style, animation registration and a viable customization approach. Preserve all current menu entries, quest flow, dialogue memory, sound, saves and combat-preview behavior throughout.

Acceptance checks: identical collision/door paths under both styles; saved profiles and attachments remain visible; action and combo timings match; Rowan's memory and quests behave the same; every preview uses the selected style or an explicit fallback; assets preload without generation on the movement path; measured frame behavior and download/decode size are acceptable on the demo machine. No full-port performance or completion-time estimate has been measured.
