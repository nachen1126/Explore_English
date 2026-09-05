"""Convert supplied artwork without cropping or inventing content.

Usage: python scripts/prepare-scene.py input.png public/scenes/name-01.webp
Add --development only for explicitly labelled legacy development illustrations.
Requires Pillow 12.3.0 (requirements-assets.txt).
"""
from pathlib import Path
from argparse import ArgumentParser
from PIL import Image, ImageOps

parser = ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--development", action="store_true")
args = parser.parse_args()
if args.output.suffix.lower() != ".webp":
    parser.error("Output must be WebP.")
with Image.open(args.source) as original:
    image = ImageOps.exif_transpose(original).convert("RGB")
if not args.development and image.size != (1536, 1024):
    parser.error("Final artwork must be exactly 1536 x 1024. No automatic cropping or stretching.")
args.output.parent.mkdir(parents=True, exist_ok=True)
for quality in (86, 82, 78, 74, 70):
    image.save(args.output, "WEBP", quality=quality, method=6)
    if args.output.stat().st_size <= 500_000:
        break
else:
    parser.error("Image exceeds 500 KB. Simplify or manually optimise the supplied artwork.")
thumbnail = image.copy()
thumbnail.thumbnail((640, 427), Image.Resampling.LANCZOS)
thumb_path = args.output.with_stem(args.output.stem + "-thumb")
thumbnail.save(thumb_path, "WEBP", quality=80, method=6)
print(f"{args.output}: {image.width}x{image.height}, {args.output.stat().st_size:,} bytes")
print(f"{thumb_path}: {thumbnail.width}x{thumbnail.height}, {thumb_path.stat().st_size:,} bytes")
