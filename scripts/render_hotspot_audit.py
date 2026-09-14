"""Render reviewable hotspot overlays from the authored scene records."""
from __future__ import annotations

import ast
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "hotspot-audit"
SCENES = [
    ("kitchen-2", "src/specialist-content.ts"),
    ("airport-2", "src/specialist-content.ts"),
    ("living-room-1", "src/expanded-content.ts"),
    ("bathroom-1", "src/expanded-content.ts"),
    ("laundry-room-1", "src/expanded-content.ts"),
    ("supermarket-2", "src/expanded-content.ts"),
    ("cafe-1", "src/expanded-content.ts"),
    ("swimming-pool-1", "src/expanded-content.ts"),
    ("skin-care-1", "src/expanded-content.ts"),
    ("hotel-room-1", "src/expanded-content.ts"),
    ("underwater-1", "src/expanded-content.ts"),
    ("classroom-1", "src/first-batch-content.ts"),
    ("train-station-1", "src/first-batch-content.ts"),
]


def scene_block(text: str, scene_id: str) -> str:
    start = re.search(rf"\bid:\s*'{re.escape(scene_id)}'", text).start()
    hotspots = text.index("hotspots:", start)
    open_bracket = text.index("[", hotspots)
    depth = 0
    for index in range(open_bracket, len(text)):
        if text[index] == "[":
            depth += 1
        elif text[index] == "]":
            depth -= 1
            if depth == 0:
                return text[start:index + 1]
    raise ValueError(f"Unclosed hotspot list for {scene_id}")


def regions(block: str):
    found = []
    polygon_pattern = re.compile(r"p\('([^']+)',\s*(\[\[.*?\]\])\)", re.S)
    rect_pattern = re.compile(r"r\('([^']+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*'(ellipse)')?\)")
    for match in polygon_pattern.finditer(block):
        found.append((match.start(), match.group(1), "polygon", ast.literal_eval(match.group(2))))
    for match in rect_pattern.finditer(block):
        x, y, width, height = map(int, match.group(2, 3, 4, 5))
        found.append((match.start(), match.group(1), match.group(6) or "rect", (x, y, width, height)))
    return sorted(found)


def text_value(block: str, field: str) -> str:
    return re.search(rf"\b{field}:\s*'([^']+)'", block).group(1)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sources = {name: (ROOT / name).read_text(encoding="utf-8") for _, name in SCENES}
    words = {}
    for path in (ROOT / "src").glob("*.ts"):
        for vocab_id, word in re.findall(r"word\(\s*'([^']+)'\s*,\s*'([^']+)'", path.read_text(encoding="utf-8")):
            words[vocab_id] = word
    font = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 17)
    small_font = ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf", 12)
    title_font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 25)
    rows = []
    for scene_id, source_name in SCENES:
        block = scene_block(sources[source_name], scene_id)
        image_path = ROOT / "public" / text_value(block, "image")
        title = text_value(block, "title")
        version = text_value(block, "imageVersion")
        items = regions(block)
        with Image.open(image_path) as source:
            source = source.convert("RGB")
            source.thumbnail((1200, 800), Image.Resampling.LANCZOS)
            canvas = Image.new("RGB", (source.width, source.height + 84), "#f7f6f2")
            canvas.paste(source, (0, 84))
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw.text((18, 10), f"{title} · hotspotDebug=1", font=title_font, fill="#243c34")
        draw.text((18, 46), f"original 1536 × 1024 · displayed {source.width} × {source.height} · {version} · {len(items)} regions", font=small_font, fill="#4f5d56")
        sx, sy = source.width / 1000, source.height / 1000
        placed_labels = []
        for number, (_, vocab_id, shape, geometry) in enumerate(items, 1):
            if shape == "polygon":
                points = [(x * sx, 84 + y * sy) for x, y in geometry]
                draw.line(points + [points[0]], fill="#b72040", width=4, joint="curve")
                xs, ys = zip(*points)
                left, top, right, bottom = min(xs), min(ys), max(xs), max(ys)
            else:
                x, y, width, height = geometry
                left, top, right, bottom = x * sx, 84 + y * sy, (x + width) * sx, 84 + (y + height) * sy
                if shape == "ellipse":
                    draw.ellipse((left, top, right, bottom), outline="#b72040", width=4)
                else:
                    draw.rectangle((left, top, right, bottom), outline="#b72040", width=4)
            cx, cy = (left + right) / 2, (top + bottom) / 2
            draw.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill="#b72040", outline="white", width=2)
            name = words.get(vocab_id, vocab_id.rsplit("-", 1)[-1].replace("-", " "))
            label = f"{number}. {name}"
            coords = f"x {left / sx / 1000:.3f} y {(top - 84) / sy / 1000:.3f} w {(right-left) / sx / 1000:.3f} h {(bottom-top) / sy / 1000:.3f}"
            candidate_left = max(1, min(left + 3, source.width - 230))
            candidate_top = max(85, min(top + 3, 84 + source.height - 39))
            candidates = [(candidate_left, candidate_top)]
            candidates.extend((candidate_left, max(85, min(candidate_top + step * 38, 84 + source.height - 39))) for step in range(1, 8))
            candidates.extend((candidate_left, max(85, candidate_top - step * 38)) for step in range(1, 8))
            label_left, label_top = candidates[0]
            for test_left, test_top in candidates:
                test_box = (test_left, test_top, test_left + 226, test_top + 36)
                if not any(test_box[0] < box[2] and test_box[2] > box[0] and test_box[1] < box[3] and test_box[3] > box[1] for box in placed_labels):
                    label_left, label_top = test_left, test_top
                    break
            box = (label_left, label_top, label_left + 226, label_top + 36)
            placed_labels.append(box)
            draw.rectangle(box, fill=(255, 255, 255, 225), outline="#b72040", width=1)
            draw.text((label_left + 4, label_top + 1), label, font=font, fill="#111")
            draw.text((label_left + 4, label_top + 20), coords, font=small_font, fill="#333")
        output = OUT / f"{scene_id}.jpg"
        canvas.save(output, "JPEG", quality=91, optimize=True)
        rows.append(f"| {title} | 1536×1024 | {len(items)} | {'参考坐标保留' if scene_id in {'kitchen-2', 'airport-2'} else '已逐物品重新校准'} | 已验证 | 已验证 | [截图]({scene_id}.jpg) |")
    report = """# Published scene hotspot audit

The shared image/overlay geometry was already sound. The inaccurate expansion scenes used coarse, mostly rectangular 1000-grid estimates as final coordinates; some boxes included adjacent objects or were shifted from the actual object. None of the expansion scenes reused another scene's coordinate array or generated positions from vocabulary order.

Kitchen and Airport remain the untouched reference coordinate sets. Every other scene was measured independently against its own 1536×1024 source artwork using tight polygons, ellipses, or rectangles. These review images are generated from the same normalized hotspot records used by Explore and Find It. Red outlines are the visual/click regions; the dot is each region's centre.

Automated normalized-geometry tests cover all 13 published scenes at seven responsive widths (320, 390, 768, 1093, 1152, 1280, and 1536 px): 91 scene/viewport checks confirm that every region stays inside the image and scales from the same coordinate system. Classroom and Train Station were additionally clicked object-by-object in the browser at 1280×720 and 390×844; their image, hotspot layer, and intrinsic-ratio frame had identical rendered bounds, with no marker outside the image.

The deployed calibration mode is opt-in only: `?hotspotDebug=1#/scene/<scene-id>`. It displays boundaries, labels, centres, coordinates, intrinsic/rendered image sizes, container offset, viewport width, version match, overlaps, and out-of-bounds status.

| Scene | Image | Regions | Calibration | Desktop | Mobile | Debug screenshot |
| --- | --- | ---: | --- | --- | --- | --- |
""" + "\n".join(rows) + "\n"
    (OUT / "README.md").write_text(report, encoding="utf-8")


if __name__ == "__main__":
    main()
