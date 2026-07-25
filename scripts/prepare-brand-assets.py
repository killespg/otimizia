"""Prepare the approved OtimizIA wordmark for web and PWA use.

The approved source is a purple/white logo over black. This script removes only
the black backdrop, keeps the artwork geometry intact, and exports the variants
used by the application.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from statistics import median

from PIL import Image, ImageChops, ImageFilter


DARK_INK = (15, 13, 17)
APP_BACKGROUND = (15, 13, 17, 255)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--mark-source", type=Path)
    parser.add_argument("--public-dir", required=True, type=Path)
    parser.add_argument("--master-dir", type=Path)
    return parser.parse_args()


def find_brand_purple(image: Image.Image) -> tuple[int, int, int]:
    samples: list[tuple[int, int, int]] = []
    for red, green, blue in image.convert("RGB").get_flattened_data():
        maximum = max(red, green, blue)
        minimum = min(red, green, blue)
        if maximum > 180 and maximum - minimum > 70 and blue > red and red > green:
            samples.append((red, green, blue))
    if not samples:
        return (138, 63, 244)
    return tuple(round(median(channel)) for channel in zip(*samples))


def remove_black_background(image: Image.Image) -> Image.Image:
    """Recover antialiased artwork from black while preserving its original color."""
    rgb = image.convert("RGB")
    red_channel, green_channel, blue_channel = rgb.split()
    maximum_channel = ImageChops.lighter(
        ImageChops.lighter(red_channel, green_channel),
        blue_channel,
    )
    local_peak_channel = maximum_channel.filter(ImageFilter.MaxFilter(15))

    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    output = result.load()
    maximum_pixels = maximum_channel.load()
    local_peak_pixels = local_peak_channel.load()

    for y in range(image.height):
        for x in range(image.width):
            red, green, blue = rgb.getpixel((x, y))
            maximum = maximum_pixels[x, y]
            local_peak = local_peak_pixels[x, y]

            if maximum <= 5 or local_peak < 24:
                continue

            coverage = min(1.0, maximum / local_peak)
            if coverage >= 0.82:
                alpha = 255
                color = (red, green, blue)
            else:
                alpha = round(coverage * 255)
                if alpha == 0:
                    continue
                scale = 255 / alpha
                color = tuple(min(255, round(channel * scale)) for channel in (red, green, blue))

            if alpha < 10:
                continue
            output[x, y] = (*color, alpha)

    return result


def content_box(image: Image.Image, alpha_threshold: int = 12) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > alpha_threshold else 0)
    box = mask.getbbox()
    if box is None:
        raise ValueError("The source did not contain visible logo artwork.")
    return box


def expand_box(
    box: tuple[int, int, int, int],
    width: int,
    height: int,
    padding: int,
) -> tuple[int, int, int, int]:
    left, top, right, bottom = box
    return (
        max(0, left - padding),
        max(0, top - padding),
        min(width, right + padding),
        min(height, bottom + padding),
    )


def crop_wordmark(image: Image.Image) -> Image.Image:
    box = expand_box(content_box(image), image.width, image.height, padding=4)
    cropped = image.crop(box)
    target_width = 1280
    target_height = round(cropped.height * target_width / cropped.width)
    return cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)


def crop_original_wordmark(source: Image.Image, transparent: Image.Image) -> Image.Image:
    """Crop the approved artwork without reconstructing or recoloring any pixel."""
    box = expand_box(content_box(transparent), source.width, source.height, padding=4)
    cropped = source.convert("RGB").crop(box)
    target_width = 1280
    target_height = round(cropped.height * target_width / cropped.width)
    return cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)


def crop_mark(image: Image.Image) -> Image.Image:
    full_box = content_box(image)
    left, top, right, bottom = full_box

    # The mark is the first connected visual group; the approved wordmark keeps
    # a clear horizontal gap before the letter "t".
    foreground_columns: list[int] = []
    alpha = image.getchannel("A")
    for x in range(left, right):
        if sum(alpha.getpixel((x, y)) > 12 for y in range(top, bottom)) >= 8:
            foreground_columns.append(x)

    gap_start = None
    previous = foreground_columns[0]
    for x in foreground_columns[1:]:
        if x > previous + 1:
            gap_start = previous + 1
            break
        previous = x
    if gap_start is None:
        raise ValueError("Could not separate the OtimizIA mark from the wordmark.")

    mark_box = content_box(image.crop((left, top, gap_start, bottom)))
    mark_box = (
        left + mark_box[0],
        top + mark_box[1],
        left + mark_box[2],
        top + mark_box[3],
    )
    mark_box = expand_box(mark_box, image.width, image.height, padding=5)
    mark = image.crop(mark_box)

    side = max(mark.width, mark.height)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(mark, ((side - mark.width) // 2, (side - mark.height) // 2))
    return square.resize((512, 512), Image.Resampling.LANCZOS)


def crop_standalone_mark(image: Image.Image) -> Image.Image:
    box = expand_box(content_box(image), image.width, image.height, padding=8)
    mark = image.crop(box)
    side = max(mark.width, mark.height)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(mark, ((side - mark.width) // 2, (side - mark.height) // 2))
    return square.resize((512, 512), Image.Resampling.LANCZOS)


def crop_original_standalone_mark(source: Image.Image, transparent: Image.Image) -> Image.Image:
    """Keep the exact approved mark over black for lossless screen blending in dark UI."""
    box = expand_box(content_box(transparent), source.width, source.height, padding=8)
    mark = source.convert("RGB").crop(box)
    side = max(mark.width, mark.height)
    square = Image.new("RGB", (side, side), (0, 0, 0))
    square.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2))
    return square.resize((512, 512), Image.Resampling.LANCZOS)


def light_wordmark(wordmark: Image.Image, purple: tuple[int, int, int]) -> Image.Image:
    result = wordmark.copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            chroma = max(red, green, blue) - min(red, green, blue)
            if chroma < 35:
                pixels[x, y] = (*DARK_INK, alpha)
            else:
                pixels[x, y] = (*purple, alpha)
    return result


def app_icon(mark: Image.Image, mark_size: int) -> Image.Image:
    icon = Image.new("RGBA", (512, 512), APP_BACKGROUND)
    resized = mark.resize((mark_size, mark_size), Image.Resampling.LANCZOS)
    offset = (512 - mark_size) // 2
    icon.alpha_composite(resized, (offset, offset))
    return icon


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def main() -> None:
    args = parse_args()
    source = Image.open(args.source).convert("RGBA")
    purple = find_brand_purple(source)
    transparent = remove_black_background(source)
    wordmark_dark = crop_wordmark(transparent)
    wordmark_light = light_wordmark(wordmark_dark, purple)
    wordmark_original_dark = crop_original_wordmark(source, transparent)
    if args.mark_source:
        mark_source = Image.open(args.mark_source).convert("RGBA")
        mark_transparent = remove_black_background(mark_source)
        mark = crop_standalone_mark(mark_transparent)
        mark_original_dark = crop_original_standalone_mark(mark_source, mark_transparent)
    else:
        mark_source = None
        mark = crop_mark(transparent)
        mark_original_dark = mark.convert("RGB")

    args.public_dir.mkdir(parents=True, exist_ok=True)
    for name in ("otimizia-logo-dark.png", "otimizia-logo-2026-dark.png"):
        save_png(wordmark_dark, args.public_dir / name)
    for name in ("otimizia-logo.png", "otimizia-logo-2026.png"):
        save_png(wordmark_light, args.public_dir / name)
    save_png(wordmark_original_dark, args.public_dir / "otimizia-logo-approved-dark.png")
    for name in ("otimizia-mark-dark.png", "otimizia-mark-2026-dark.png"):
        save_png(mark, args.public_dir / name)
    for name in ("otimizia-mark.png", "otimizia-mark-2026.png"):
        save_png(mark, args.public_dir / name)
    save_png(mark_original_dark, args.public_dir / "otimizia-mark-approved-dark.png")
    save_png(app_icon(mark, 356), args.public_dir / "otimizia-app-icon-2026.png")
    save_png(app_icon(mark, 300), args.public_dir / "otimizia-app-icon-2026-maskable.png")

    if args.master_dir:
        args.master_dir.mkdir(parents=True, exist_ok=True)
        save_png(source, args.master_dir / "otimizia-logo-master.png")
        if mark_source:
            save_png(mark_source, args.master_dir / "otimizia-mark-master.png")

    print(f"Brand purple: rgb{purple}")
    print(f"Wordmark: {wordmark_dark.width}x{wordmark_dark.height}")
    print("Mark and PWA icons: 512x512")


if __name__ == "__main__":
    main()
