"""Remove the baked neutral checkerboard from the approved first drawings.

User authorized programmatic removal on 2026-09-10. Source RGB is preserved;
only background alpha changes. Requires Pillow and numpy. Originals stay intact.
"""
import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def cutout(source, destination):
    image = Image.open(source).convert('RGBA')
    rgba = np.array(image)
    rgb = rgba[:, :, :3].astype(np.int16)
    # Foreground has dark ink boundaries and colored fills. Only pale neutral
    # pixels connected to the outside qualify; enclosed pale details survive.
    eligible = (rgb.max(2) - rgb.min(2) < 28) & (rgb.min(2) > 125)
    height, width = eligible.shape
    outside = np.zeros_like(eligible)
    queue = deque()
    for x, y in [(x, y) for x in range(width) for y in (0, height - 1)] + [(x, y) for y in range(height) for x in (0, width - 1)]:
        if eligible[y, x] and not outside[y, x]:
            outside[y, x] = True
            queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and eligible[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True
                queue.append((nx, ny))
    rgba[outside, 3] = 0
    # Reduce a pale antialias fringe only along the exposed silhouette. Preserve
    # all dark ink and all interior RGB/alpha; do not globally key out grays.
    border = np.asarray(Image.fromarray(outside.astype('uint8') * 255).filter(ImageFilter.MaxFilter(3))) > 0
    fringe = border & ~outside & (rgb.max(2) - rgb.min(2) < 28) & (rgb.min(2) > 80)
    rgba[fringe, 3] = np.minimum(rgba[fringe, 3], np.clip((190 - rgb[fringe].mean(1)) / 110 * 255, 0, 255).astype('uint8'))
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba).save(destination, optimize=True)
    assert np.array_equal(rgba[:, :, :3], rgb.astype('uint8'))
    print(f'{destination.name}: {width}x{height}, transparent {(rgba[:, :, 3] == 0).mean():.1%}; RGB unchanged')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('table', type=Path)
    parser.add_argument('ember', type=Path)
    parser.add_argument('--output', type=Path, default=Path('public/art/study'))
    args = parser.parse_args()
    cutout(args.table, args.output / 'tilth-table-v2.png')
    cutout(args.ember, args.output / 'tilth-ember-v2.png')
