#!/usr/bin/env python3
"""Generate PWA icons by rasterizing the Knewave Outline 'z' glyph onto a
dark, rounded-corner background. Run after changing brand colors or font.

Requires: pip install Pillow

Outputs:
  public/pwa-192x192.png
  public/pwa-512x512.png
  public/apple-touch-icon.png

The matching SVG favicon (public/favicon.svg) embeds the same glyph as a
direct path and is hand-maintained — re-extract via fontTools if the font
changes.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
FONT = PUBLIC / 'fonts' / 'knewave-outline.ttf'

BG = (8, 13, 20, 255)        # #080d14 — matches CSS --background
FG = (29, 233, 246, 255)     # #1de9f6 — matches CSS --primary (neon cyan)

GLYPH_HEIGHT_RATIO = 0.66    # fraction of canvas the glyph occupies
CORNER_RATIO = 0.20          # rounded-corner radius / canvas size


def fit_font_size(canvas_size: int) -> int:
    target = int(canvas_size * GLYPH_HEIGHT_RATIO)
    lo, hi, best = 10, canvas_size * 4, 10
    while lo <= hi:
        mid = (lo + hi) // 2
        f = ImageFont.truetype(str(FONT), mid)
        bbox = f.getbbox('z')
        h = bbox[3] - bbox[1]
        if h <= target:
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return best


def render(size: int, out_name: str) -> None:
    base = Image.new('RGBA', (size, size), BG)
    draw = ImageDraw.Draw(base)
    f = ImageFont.truetype(str(FONT), fit_font_size(size))
    bbox = f.getbbox('z')
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    # Compensate for the bbox offset so the glyph itself centers, not its origin.
    x = (size - w) / 2 - bbox[0]
    y = (size - h) / 2 - bbox[1]
    draw.text((x, y), 'z', font=f, fill=FG)

    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size, size), radius=int(size * CORNER_RATIO), fill=255
    )
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)

    target = PUBLIC / out_name
    out.save(target)
    print(f'wrote {target.relative_to(ROOT)} ({size}x{size})')


if __name__ == '__main__':
    render(192, 'pwa-192x192.png')
    render(512, 'pwa-512x512.png')
    render(180, 'apple-touch-icon.png')
