# Prepared illustration study assets

## Active Tilth-specific assets (v2)

`tilth-bed-v2.png`, `tilth-table-v2.png`, `tilth-chest-v2.png` and `tilth-ember-v2.png` were generated using the built-in image tool on 10 September 2026 from references captured directly from Tilth's own renderer. They follow the original subject designs and palette with ink and colored-pencil treatment. No OMORI assets are used.

The 8-column, 4-row Ember atlas has rows down, left, up, right. Columns 1–6 contain walking poses; columns 7–8 contain settling/idle poses. It covers the brown Swept hair, copper Coat appearance only. Weapons and custom attachments remain separate original Tilth rendering.

The table and Ember PNGs derive from the **first** generated versions. After later image-tool repair attempts degraded the drawings and still returned fake transparency, Hayden explicitly requested programmatic background removal on those first versions. `scripts/prepare-ink-cutouts.py` changes only background/edge alpha and preserves every source RGB value. Bed and chest were copied unchanged with their generated alpha. The renderer checks alpha and computes source crops on load.

Original approved table and Ember inputs are retained in `docs/art/source/`. To reproduce the two cutouts with Pillow and numpy, from the repository root:

```sh
python scripts/prepare-ink-cutouts.py docs/art/source/tilth-table-first.png docs/art/source/tilth-ember-first.png
```

Generation prompts, native-renderer references, asset hashes and light/dark alpha QA are in `docs/art/`. No credentials or runtime generation requirement are included.

## Earlier Notebook World studies

The other PNGs were copied without changes from Notebook World's prepared artwork on `codex/notebook-checkpoint` (`dc6eee2`). They are retained for history/reference but are no longer loaded by the inn proof. Their blue-haired character, front-view desk and cupboard do not represent the approved Tilth-specific direction.

See `docs/ART_STUDY.md` and `docs/CHARACTER_ART.md` for scope, validation and the proposed customization pipeline.
