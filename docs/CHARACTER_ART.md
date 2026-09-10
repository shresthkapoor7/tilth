# Customizable drawn characters

Decision proposal, 10 September 2026. The current inn proof has one complete drawn avatar; it is not the production customization format.

## Keep the current editor and profile

Tilth already stores `hairStyle`, `hairColor`, `skinColor`, `clothing`, `outfitColor`, `weapon` and custom `characterArt`. Those fields should select parts and palettes in the renderer. No generated image URL belongs in the saved character profile. A color or hairstyle change must appear immediately, without a model request.

The proof only substitutes its complete avatar when all five covered appearance fields match the reference: Swept hair, brown `#705039`, skin `#e4b47e`, Coat, copper `#a85b37`. Names and weapons can vary because the original weapon renderer remains separate. Other appearance choices automatically use the existing pixel character, including in dialogue. This prevents a drawing from silently concealing an editor change.

## Produce parts against a master pose set

Use the existing screen-aligned camera and one fixed body scale. Author body poses first, with feet, neck, head, hands and waist anchors. All assets use the same canvas dimensions, origin and direction conventions. Never resize individual parts to their tight visible bounds when assembling a character.

| Part | Content | Editor mapping |
| --- | --- | --- |
| Body | Exposed skin, face, legs, hands | Skin color mask |
| Clothing back | Coat tails, robe back, cloak | Clothing choice and outfit mask |
| Clothing front | Torso, sleeves, bracers | Clothing choice and outfit mask |
| Hair back | Braid or curls behind the neck | Hairstyle and hair mask |
| Hair front | Crown, fringe, side locks | Hairstyle and hair mask |
| Equipment | Bow, staff, sword, spear, accessories | Existing weapon and generated attachment data |

Start with four facing directions, six walk frames and idle. A frame descriptor owns its body pose and attachment anchors; every part follows that descriptor. Hair can reuse a facing drawing across walk frames and follow the head anchor, so each hairstyle does not require a unique drawing for every footstep. Coats need actual moving hem/sleeve drawings. Add intermediate front/side and back/side drawings for deliberate short turns; the proof's settling frames are not a complete directional turning set.

Draw order is defined per direction. For example, front-facing hair back precedes the body, coat tails precede legs, sleeves cover upper arms, and hair front covers the forehead. Facing away changes which hand and weapon segments sit behind the torso. Avoid one universal layer order that puts a braid over a face or a bow through a chest.

## Separate color from linework

Deliver each recolorable part as a neutral shaded fill, a true alpha mask for each color region, and ink/detail overlays. The renderer applies the selected color only inside its mask, preserving luminance variation and then adding the original outlines and pencil marks. Eyes, buckles, boots and brass trim are protected regions. Do not guess a hair mask by selecting all brown pixels from a flattened character; that would also recolor boots and skin shadows.

Prepare the recolored atlases in an offscreen Canvas when an editor selection changes, then draw those cached images during play. Cache keys include asset revision, hairstyle, clothing and palette. Evict old previews so exploring many colors does not retain an unlimited number of canvases. Saves still contain the existing compact profile values.

## Asset acceptance

Generate or draw each new part against the approved master poses and existing part references. Check real PNG alpha, per-cell bounds, fixed anchors, front/back occlusion and silhouette consistency before including it. Check both light and dark floors; a visible transparency pattern or colored halo fails acceptance.

Preview the hardest combinations first: long hair plus a coat, pale hair against dark walls, dark skin with exposed hands, and weapons on both sides. Inspect walking and turning in motion. Verify that changing one editor field changes only its intended region. If a required part is missing, retain a complete supported appearance rather than mixing incompatible body proportions.

## Hackathon sequence

1. Approve the corrected Tilth-specific room and complete-avatar proof.
2. Extract a master body and one Coat set, then add Swept and one visibly different hairstyle, each with masks. Prove hair, skin and coat color changes in the existing editor.
3. Add intermediate turn drawings and the remaining hairstyles/clothes against those same anchors.
4. Extend the same character renderer to dialogue portraits, editor previews and combat, with explicit pose coverage and fallback.

No 3D engine is required for this design. The difficult work is consistent artwork and registration. The renderer assembles prepared layers; it does not generate new frames while the player walks.
