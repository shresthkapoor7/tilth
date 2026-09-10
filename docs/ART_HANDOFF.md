# Art handoff: continue Tilth's ink presentation

10 September 2026. Start from `codex/tilth-integration` in **shresthkapoor7/tilth**. This branch already contains the artwork, renderer integration, teammate gameplay changes and the separate notebook implementation. A PR is not required to fetch it. The earlier memory PR was merged before this art pass; it does not contain these later assets.

```sh
git fetch origin codex/tilth-integration
git switch -c your-art-work --track origin/codex/tilth-integration
```

These commands assume `origin` is shresthkapoor7/tilth and the branch name is unused. Preserve any local teammate work before switching. For a checkout on another base, compare and merge deliberately: copying `main.js` over newer work would overwrite gameplay changes. The combined checkpoint is validated; unpublished edits on other machines were not available for conflict checking.

## What to use

| Material | Location and purpose |
| --- | --- |
| Current environment cutouts | [public/art/environment](../public/art/environment/): 17 optimized WebP images; 15 used in play, ash-ground and stone-path are spare textures |
| Full-resolution originals after alpha cleanup | [environment-master](art/environment-master/): lossless first-drawing masters, before runtime resizing/compression; start edits here |
| Environment generation prompts | [environment-prompts.json](art/environment-prompts.json): exact prompt and native-render reference per asset |
| Geometry/design references | [environment-reference](art/environment-reference/): direct Tilth renders, including the full map |
| Manifest | [environment-assets.json](art/environment-assets.json): source filename/hash, master/runtime path, dimensions, alpha bounds and runtime hash |
| Visual comparison | [Contact sheet](art/environment-contact-sheet.jpg), [world](art/environment-world.png), [pixel reference](art/environment-pixel-reference.png), [smithy](art/environment-smith.png), [house](art/environment-home.png), [phone](art/environment-mobile.png) |
| Current inn furniture and avatar proof | [public/art/study](../public/art/study/): use the four `tilth-*-v2.png` files; other PNGs are earlier studies |
| Inn generation prompts/references | [tilth-v2-prompts.json](art/tilth-v2-prompts.json), [tilth-reference](art/tilth-reference/), [source](art/source/), [hashes](art/asset-sha256.json), [alpha QA](art/cutout-qa.png) |
| Implementation and limitations | [Environment coverage](ENVIRONMENT_ART.md), [inn proof](ART_STUDY.md), [renderer architecture](ART_PORT.md), [future character layers](CHARACTER_ART.md) |
| Notebook mechanics | [NOTEBOOK_PORT.md](NOTEBOOK_PORT.md); it uses the shared simulation and does not require new raster generation |

The environment's original generator PNG filenames are provenance records, not portable file paths. Their alpha-cleaned, full-resolution lossless masters are committed, so another machine can use and edit the art without Hayden's image-tool folder. The original first table and Ember PNGs are also committed in `docs/art/source/`. Later degraded repair generations are not the baseline.

## Current direction: drawing language, Tilth designs

Keep Tilth's existing subjects, silhouettes, proportions, material colors, room geometry and volcanic setting. Transfer the ink-and-colored-pencil drawing language from the successful inn furniture. The OMORI screenshots motivated the contrast between worked marks and quiet areas; they are not assets to import or a requirement to reproduce that game's characters or battle layout.

The primary medium reference is [the first cleaned Tilth table](../public/art/study/tilth-table-v2.png). Use it alongside the new subject's native Tilth render. Label their roles explicitly: **subject/design/camera/palette** versus **drawing medium only**. Do not let a furniture reference turn every new asset into a brown wooden object.

This section supersedes the earlier Notebook World bedroom's lavender palette, blue-haired student, corner view and large-head proportions. Historical studies remain available, but they are not current Tilth production designs. The character work is paused; the existing avatar sheet is a limited proof, not a complete customizable character system.

### Camera and physical construction

Use a fixed, screen-aligned elevated 2D RPG view. Room edges and rectangular floor-plane footprints follow screen X/Y. No corner-isometric rotation or vanishing-point taper. A rectangular tabletop has equal-width horizontal front/back edges and parallel screen-vertical depth edges. Its front apron is shallow; a tall frontal desk with long projecting legs appears tilted in this world.

Roof slopes, curves, flames and fabric folds can have diagonal lines because they describe the subject. The prohibition is on rotating or tapering its ground-plane construction. Buildings keep their exact facade, roof silhouette, window count and centered door/threshold. A bridge keeps its flat rectangular crossing clear. Do not invent side walls, porches, steps or extra props to make an asset more elaborate.

In code, the image rectangle and collision footprint are separate. Crop transparent padding before fitting environment art to its recorded bounds. Preserve the ground-contact/door anchor. Never change physics to compensate for a wrong-view drawing. Do not crop and independently stretch animation cells; their shared registration must survive every frame.

### Line, texture and detail

- Start with a clear silhouette. Outer contours should be stronger than internal marks; approximately twice the weight is a starting judgment, not a measured requirement.
- Use decisive, slightly irregular charcoal/deep-indigo strokes. A few pressure changes and restated joins create the hand-drawn feel. Randomly wobbling every straight structural edge breaks the object.
- Put directional hatching in selected material/shadow regions. Preserve broad, nearly flat color areas. Uniform paper noise over a polished illustration is not the target.
- Darken joins under a rim, fringe, sleeve or stone overlap. Avoid thick uniform sticker outlines and pale extraction halos.
- Inspect at actual game size. If hatching becomes grey mush or a handle/leg disappears, simplify the drawing. Generation-resolution detail is not the acceptance criterion.

### Palette and materials

The native render is the palette authority. Hex values below are anchors used in the prompts, not a requirement for every generated pixel to match exactly.

| Subject/material | Drawing treatment and color anchors |
| --- | --- |
| Buildings and rocks | Broad charcoal masses, readable roof/stone joints, selected rough hatch patches. Stone `#444541`, slate `#303b3d` / `#394143`, ash/ochre trim; amber windows supply the strongest accent. |
| Table and wood | Straight joints and correct silhouette; a few grain lines following each plane. Wood `#715238`, rim `#997345`, highlights `#bc955a`, underside `#392e24`. Preserve the pale parchment and sage mug. No invented drawer or knob. |
| Bed and fabric | Broad quiet teal blanket, sparse contact folds, rectangular mattress, cream pillow and ochre band. Teal `#506f6b`, accent `#8baba0`, pillow `#dbd0a6` / `#eee2b7`, frame `#ac8858`. No ornate curved headboard. |
| Chest | Compact wooden storage box, two brass bands, lid seam and central latch. Wood `#91683b`, brass `#c3b27b`, seam `#cca063`, latch `#e6c56d`. Do not redesign it as a cupboard. |
| Metal and tools | Functional silhouette, restrained cool flat fill, one light edge and dark contact region. Preserve holes and negative spaces. Avoid chrome reflections and tangled detail. |
| Paper, ceramic, glass | Quiet pale fills; sparse page lines, a readable cup opening/handle, or a small waterline/reflection. Keep pale subject pixels opaque where intended. Avoid random text, product-render gloss and realistic refraction. |
| Fire, embers and lava | Simple readable orange/gold shapes against the charcoal setting. Keep external glow out of reusable cutouts; use renderer effects for atmosphere. New effect frames should be prepared in advance. |
| Ground and room planes | Lower contrast than props and people, with open movement space. Sparse seams and material marks; avoid dense grain everywhere. Terrain is an opaque background, not a transparent sprite. |

### People, if character work resumes later

Preserve each Tilth profile's design and proportions. The current Ember proof uses Swept brown hair `#705039`, skin `#e4b47e`, copper Coat `#a85b37`, dark underclothes and brown boots; the head is about one fifth of the body height. Do not substitute the earlier blue-haired child in a yellow cardigan.

Hair is built from connected masses with directional pencil marks. Faces stay simple: quiet cheeks, restrained eye highlights, small decisive mouth/nose marks. Expressions change brows/lids/mouth and minimal posture while preserving skull, hair silhouette, crop and clothing. Avoid glossy anime eyes and automatically adding faces to ordinary props.

The prepared atlas is eight columns by four rows: down, left, up, right; six walk phases plus settling/idle cells. It does not cover every hairstyle, outfit, recolor, directional turn or attack. Keep the existing weapon renderer and explicit fallback. For further work, use the registered body/hair/clothing layers and color-mask plan in [CHARACTER_ART.md](CHARACTER_ART.md); do not repeatedly regenerate a flattened avatar when a player changes hair color.

## Prompt recipe

Use the exact committed prompt for an existing asset. For a new one, retain the stable block and change only the subject-specific construction. Attach a render of the actual new subject plus the chosen medium reference. This is a template for a generation request, not a guarantee that alpha or geometry will pass.

```text
Use case: style-transfer. Production raster game asset for Tilth.
Input image 1: exact subject, design, silhouette, camera and palette reference.
Input image 2: drawing-medium reference only; do not copy its subject.

Redraw image 1 with confident imperfect dark charcoal/indigo ink contours,
flat restrained colors, selective directional colored-pencil grain and
hatching, and quiet broad surfaces. Preserve Tilth's design and proportions.

Camera: fixed screen-aligned elevated 2D RPG projection. Horizontal world
edges parallel to screen X, rectangular floor depth parallel to screen Y.
No corner-isometric rotation or vanishing-point taper.

Subject: [one asset; exact structural features, counts, materials, palette].
Registration: [aspect ratio, ground/door anchor, required empty openings].
Remove [floor or neighboring fragments present in the reference].

One entire uncropped object with transparent padding and actual zero alpha
outside the silhouette. Keep opaque subject fills and all functional holes.
No painted checkerboard, white card, ground plane, baked shadow or external
glow. No new props, people, labels, text, scenery or ornaments.

Avoid glossy 3D rendering, polished anime, uniform noise, vector-perfect
contours, excessive microdetail, unrelated palette changes and wrong-view
construction. The image must remain readable at its in-game display size.
```

For terrain, replace the transparency paragraph with an explicit opaque background requirement and describe the whole composition. Do not bake independently placed buildings, actors or movable props into it. For expression/state variants, name the single intended change and list identity, crop, palette, scale and camera as invariants.

The current batch used the built-in image-generation tool, one image per request, with reference images. The tool did not expose a model selector in this workflow; the game's text-generation model setting is not the image generator's identity. The exact executed prompts are the JSON files above. Gameplay uses prepared images and never waits for image generation while walking.

## Transparency and preserving good originals

A `.png` filename does not prove transparency. The generator painted white/checkerboard backgrounds into several first drawings. Hayden authorized programmatic removal and specifically requested preserving the first good images instead of further generative repair. The current environment props use **real-alpha WebP**; the inn assets use PNG. Terrain and both spare floor textures are intentionally opaque.

Use existing masters directly for edits. Save a versioned sibling before replacing an accepted asset. Do not use screenshots, contact sheets, or repeatedly compressed runtime copies as editing masters.

The reproducible environment packer is `scripts/prepare-environment-art.py` (Python, Pillow and numpy). Its input is a JSON array of `{key, source, transparent}`, where `source` points to a locally available generated file. It writes the `-v1` masters, runtime files, manifest and contact sheet. Run it in a separate working checkout/output copy for experiments: it currently overwrites those named outputs and its cleanup thresholds are tailored to the first batch. The three fence-hole seeds are specific to that drawing; they are not a general segmentation rule.

The packer removes edge-connected pale neutral background pixels, preserves source RGB in the lossless master, and separately crops/resizes/compresses the runtime copy. It does not globally delete all white/grey pixels; that would destroy paper, pillow highlights and metal. A Pillow image created from an array needs a writable copy before the flood operation. This was the cause of the earlier preview's failed cleanup and is fixed in the committed script.

For the original table/Ember inputs, the separate `scripts/prepare-ink-cutouts.py` command is documented in [the asset README](../public/art/study/README.md). Use `--output` to choose a separate destination when experimenting.

Inspect every cutout over dark charcoal, light paper and the actual room. Check outside alpha is zero, pale internal details survive, holes between fence rails/handles are open, and no rectangular edge or light fringe appears. Alpha statistics alone cannot certify a good cutout. Check all reused placements after any cleanup change.

## Where the renderer connects

- `volcanic.js` records scenery bounds while executing Tilth's existing collision construction. `engine/ink-environment.js` consumes the same records. Preserve their ordering and door anchors.
- `world.js` owns interior furnishing geometry. `interiors.js` is the native reference. `engine/ink-study.js` provides the inn shell, registered furniture/character proof and its comparison controls.
- `main.js` selects the prepared presentation. Logical coordinates remain 800 × 600; the backing canvas is 1600 × 1200, with a closer inn transform. `engine/world-viewport.js` maps object selection through the actual camera. Preserve this mapping when changing zoom.
- The environment adapter caches scenes. Its 15 new active assets total about 1.04 MB; all 17 runtime files total about 1.28 MB. Those figures exclude the older inn PNGs and are not a whole-game download or frame-rate claim.
- AI-generated outdoor regions retain their existing renderer. Shared interactive objects and NPCs retain their current drawing. The environment pass does not add universal foreground occlusion; much scenery is still a cached background. Tall-object overlap needs deliberate foreground layers and ground-depth ordering when extended.

## Continue from here

First choose one asset or one clearly bounded area. Capture the current native render, produce one matching drawing from the same medium reference, register it against the existing geometry, and inspect it at gameplay scale before expanding a batch. Keep character production paused unless the team deliberately resumes it.

Useful next work is foreground overlap, generated-region environment coverage, smaller runtime versions of the old inn PNGs, or a new prepared prop/state. Each needs its own visual check. Keep interactive state art separate from static room art so a burned, moved, opened or extinguished object can visibly change.

Before handing off a replacement: inspect light/dark alpha, camera, material and scale; walk around it and through nearby doors; compare Ink/Pixel with the same profile; check phone layout; preserve source, exact prompt, reference roles and versioned output; update the manifest and coverage notes. Do not claim a prompt alone guarantees quality or that a screenshot proves correct collision.

The combined branch checkpoint passed 143 Node tests, 6 Vitest tests, typecheck and production build. Browser checks covered art switching, normal room routes, transparency, notebook consequences and generated-region return/revisit. Notebook AI was tested with explicit fixtures, not a new live provider run. Run commands and current limits are in [STATUS.md](../STATUS.md).
