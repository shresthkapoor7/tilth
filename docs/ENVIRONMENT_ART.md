# Cinderwatch environment artwork

10 September 2026. Seventeen first-pass images generated concurrently with the built-in image tool, using direct Tilth renders for geometry and the approved inn table for the drawing language. No new character artwork or character behavior is included in this pass.

## Coverage

- Cinderwatch ground, paths and lava; the inn, smithy and watchkeeper house exteriors.
- Bridge, forge, outdoor anvil, crates, fences, rocks, trees and braziers at their original positions.
- Smithy hearth/anvil/shelf and watchkeeper shelf, with the existing approved bed/table/chest drawings reused across interiors.
- Two additional ash-ground and stone-path textures are available for future composition.

Fifteen new files load during play (about1.04MB without HTTP headers); the full17-file runtime library is1.28MB. The existing inn furniture is shared. All scenes are prepared and cached; no image generation runs during movement or room transitions. Future AI-generated regions still use their existing renderer until explicitly covered.

## Sources, alpha and registration

[Prompts](art/environment-prompts.json), [original Tilth references](art/environment-reference/), [asset manifest](art/environment-assets.json), [contact sheet](art/environment-contact-sheet.jpg), and full-resolution lossless masters in `docs/art/environment-master/` are included. Runtime WebP files live in `public/art/environment/`.

The generator baked checkerboards into the first drawings. User-authorized programmatic cleanup removes edge-connected pale neutral backgrounds, including three explicit fence openings. It preserves source RGB in the lossless masters and changes alpha only. Runtime files are cropped, resized for display and encoded separately. Original generated PNGs remain in the local image-tool output folder; their filenames and hashes are recorded in the manifest. WebP supports real alpha; PNG is not required. Terrain and the two floor textures are intentionally opaque.

`scripts/prepare-environment-art.py` accepts an output-map JSON list of `{key, source, transparent}` and reproduces masters, optimized files, manifest and contact sheet with Pillow/numpy. Alpha cleanup is tailored to these first drawings, not a universal segmentation model.

`drawVolcanic` records asset bounds while executing Tilth's original collision construction. The environment adapter uses that same ordered list; switching art does not rebuild physics or change doors. Interiors use the existing furnishing records. Source padding is cropped before drawing. Screen-horizontal construction and original footprints are retained.

## Validation and limits

Focused tests cover every outdoor asset registration, building door anchors, bridge safety, stable collision records and complete interior furniture coverage. Browser verification at1280×720 covers transparent scenery, Ink/Pixel comparison, profile preservation, actual keyboard routes to the smithy/house and normal exits. Mobile controls were checked at390×844. Fifteen environment requests were observed, with no additional environment downloads on room entry and no page errors. Local transfer timings are not a claim about public hosting or frame rate.

The environment pass uses the existing actor renderer and cached-background overlap behavior. The inn retains its earlier depth-sorted drawing proof. This does not add universal foreground occlusion, new characters, character customization layers or hand-drawn battle/region creatures.

Local run: `node node_modules/vite/bin/vite.js --configLoader native --host 127.0.0.1 --port 5174 --strictPort`.
