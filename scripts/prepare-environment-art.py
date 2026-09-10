"""Package first-pass generated scenery; user-authorized alpha cleanup only.

Usage: python scripts/prepare-environment-art.py path/to/output-map.json
The map is a list of {key, source, transparent}. Originals are never modified.
Requires Pillow and numpy. Lossless WebP keeps every visible source RGB pixel.
"""
import argparse
from concurrent.futures import ProcessPoolExecutor
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def package(job):
    source = Path(job['source'])
    output = Path(job['output'])
    image = Image.open(source).convert('RGBA')
    rgba = np.array(image)
    original_rgb = rgba[:, :, :3].copy()
    if job['transparent'] and (rgba[:, :, 3] == 0).mean() < .01:
        rgb = original_rgb.astype(np.int16)
        eligible = (rgb.max(2) - rgb.min(2) < 28) & (rgb.min(2) > 125)
        # Flood an eligibility mask, not the art. A padded white rim joins all
        # exposed background edges; protected enclosed pale details survive.
        mask = Image.fromarray(np.pad(eligible.astype('uint8') * 255, 1, constant_values=255)).copy()
        ImageDraw.floodfill(mask, (0, 0), 100)
        if job['key'] == 'fence':
            # Three enclosed openings between this first drawing's rails/posts.
            # Explicit background seeds avoid globally deleting pale materials.
            for nx in (.19, .42, .65):
                ImageDraw.floodfill(mask, (round(nx * image.width) + 1, round(.47 * image.height) + 1), 100)
        outside = np.asarray(mask)[1:-1, 1:-1] == 100
        assert outside.mean() > .01, 'Background flood failed: ' + job['key']
        rgba[outside, 3] = 0
        border = np.asarray(Image.fromarray(outside.astype('uint8') * 255).filter(ImageFilter.MaxFilter(3))) > 0
        fringe = border & ~outside & (rgb.max(2) - rgb.min(2) < 28) & (rgb.min(2) > 80)
        rgba[fringe, 3] = np.minimum(rgba[fringe, 3], np.clip((190 - rgb[fringe].mean(1)) / 110 * 255, 0, 255).astype('uint8'))
    assert np.array_equal(original_rgb, rgba[:, :, :3])
    cleaned = Image.fromarray(rgba)
    master = Path(job['master'])
    cleaned.save(master, 'WEBP', lossless=True, quality=100, method=3, exact=True)
    restored = np.array(Image.open(master).convert('RGBA'))
    visible = rgba[:, :, 3] > 0
    assert np.array_equal(rgba[visible], restored[visible]), output
    assert np.array_equal(rgba[:, :, 3], restored[:, :, 3]), output
    # Keep the lossless first drawing for editing; serve a display-sized copy.
    runtime = cleaned.crop(cleaned.getbbox()) if job['transparent'] else cleaned.copy()
    limit = 1600 if job['key'] == 'terrain' else 600 if job['key'].startswith('building-') else 768 if job['key'] in ('ash-ground','stone-path') else 480
    runtime.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    # Transparent padding lets the runtime verify alpha without affecting anchors.
    if job['transparent']:
        padded = Image.new('RGBA', (runtime.width + 8, runtime.height + 8))
        padded.paste(runtime, (4, 4))
        runtime = padded
    runtime.save(output, 'WEBP', quality=92, method=4)
    return dict(key=job['key'], file='public/art/environment/' + output.name,
                masterFile='docs/art/environment-master/' + master.name,
                sourceFile=source.name, sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                sha256=hashlib.sha256(output.read_bytes()).hexdigest(), width=image.width,
                height=image.height, bytes=output.stat().st_size,
                transparentFraction=round(float((rgba[:, :, 3] == 0).mean()), 4),
                alphaBounds=cleaned.getbbox(), masterVisibleRgbPreserved=True,
                runtimeWidth=runtime.width, runtimeHeight=runtime.height)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('map', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    destination = root / 'public/art/environment'
    destination.mkdir(parents=True, exist_ok=True)
    masters = root / 'docs/art/environment-master'
    masters.mkdir(parents=True, exist_ok=True)
    jobs = json.loads(args.map.read_text(encoding='utf-8'))
    for job in jobs:
        job['output'] = str(destination / (job['key'] + '-v1.webp'))
        job['master'] = str(masters / (job['key'] + '-v1.webp'))
    with ProcessPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(package, jobs))
    (root / 'docs/art/environment-assets.json').write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
    sheet = Image.new('RGB', (1440, 5 * 290), '#ede8dc')
    draw = ImageDraw.Draw(sheet)
    for i, r in enumerate(records):
        x, y = (i % 4) * 360, (i // 4) * 290
        draw.rectangle((x + 5, y + 5, x + 355, y + 257), fill='#323d3c')
        art = Image.open(root / r['file']).convert('RGBA')
        art = art.crop(art.getbbox())
        art.thumbnail((330, 235), Image.Resampling.LANCZOS)
        sheet.paste(art, (x + (360 - art.width) // 2, y + 12 + (235 - art.height) // 2), art)
        draw.text((x + 14, y + 268), r['key'], fill='#172224')
    sheet.save(root / 'docs/art/environment-contact-sheet.jpg', quality=90)
    print(json.dumps({'assets': len(records), 'bytes': sum(r['bytes'] for r in records), 'transparent': {r['key']:r['transparentFraction'] for r in records}}, indent=2))


if __name__ == '__main__':
    main()
