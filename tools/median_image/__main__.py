"""
python -m tools.median_image SRC [SRC ...] --out DEST

Walks every SRC folder (recursively). Each folder that directly contains images gets ONE
image copied to DEST: the image closest to the folder's median image.

  The median image is the pixel-wise median of every image in the folder, each shrunk to
  a 16x16 colour thumbnail. It is not a real photo, so the copy is the real image nearest
  to it (L1 distance). Outliers (a screenshot among holiday photos) cannot pull it,
  which is why it is a median and not a mean.

Copies are named after the folder they came from, so DEST reads as a table of contents:
  photos/2023/rome/IMG_0042.jpg  ->  DEST/photos__2023__rome__IMG_0042.jpg

Options:
  --by name         take the middle file in name order instead (no decoding; fast)
  --min-images N    skip folders with fewer than N images (default 1)
  --no-recurse      only look at the SRC folders themselves, not their subfolders
  --dry-run         print what would be copied, copy nothing

DEST also gets index.csv: folder, image count, picked file, distance to the median.
Originals are never modified; DEST is skipped if it lies inside a SRC.
"""

from __future__ import annotations

import argparse
import csv
import os
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

try:  # iPhone photos, when the plugin happens to be installed
    from pillow_heif import register_heif_opener

    register_heif_opener()
    HEIF = {".heic", ".heif"}
except ImportError:
    HEIF = set()

EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tif", ".tiff", ".webp"} | HEIF
THUMB = 16


def image_folders(roots: list[Path], recurse: bool, skip: Path):
    """Yield (folder, sorted image paths) for every folder that directly holds images."""
    for root in roots:
        walker = os.walk(root) if recurse else [next(os.walk(root))]
        for dirpath, dirnames, filenames in walker:
            folder = Path(dirpath)
            # Don't descend into the output folder or hidden folders (.git, .thumbnails).
            dirnames[:] = sorted(
                d for d in dirnames
                if not d.startswith(".") and (folder / d).resolve() != skip
            )
            images = sorted(
                (folder / f for f in filenames if Path(f).suffix.lower() in EXTENSIONS),
                key=lambda p: p.name.lower(),
            )
            if images:
                yield root, folder, images


def thumbnail(path: Path) -> np.ndarray | None:
    try:
        with Image.open(path) as im:
            im.draft("RGB", (THUMB * 8, THUMB * 8))  # JPEG: decode at reduced size
            im = ImageOps.exif_transpose(im).convert("RGB")
            return np.asarray(im.resize((THUMB, THUMB), Image.BILINEAR), np.float32).ravel()
    except (UnidentifiedImageError, OSError, ValueError) as e:
        print(f"  skip {path}: {e}", file=sys.stderr)
        return None


def pick_median(images: list[Path]) -> tuple[Path, float] | None:
    paths, feats = [], []
    for p in images:
        f = thumbnail(p)
        if f is not None:
            paths.append(p)
            feats.append(f)
    if not feats:
        return None
    feats = np.stack(feats)
    median = np.median(feats, axis=0)
    dist = np.abs(feats - median).mean(axis=1)  # mean absolute difference, 0..255
    i = int(dist.argmin())
    return paths[i], float(dist[i])


def pick_middle(images: list[Path]) -> tuple[Path, float]:
    return images[(len(images) - 1) // 2], float("nan")


def flat_name(root: Path, image: Path) -> str:
    rel = image.relative_to(root.parent if root.parent != root else root)
    return "__".join(rel.parts)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        prog="python -m tools.median_image",
        description="Copy one representative (median) image per folder into DEST.",
    )
    ap.add_argument("src", nargs="+", type=Path, help="folder(s) to walk")
    ap.add_argument("--out", required=True, type=Path, help="destination folder")
    ap.add_argument("--by", choices=["look", "name"], default="look",
                    help="look = nearest the median image (default); name = middle file")
    ap.add_argument("--min-images", type=int, default=1)
    ap.add_argument("--no-recurse", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)

    roots = [s.resolve() for s in args.src]
    for r in roots:
        if not r.is_dir():
            ap.error(f"not a folder: {r}")
    out = args.out.resolve()
    if not args.dry_run:
        out.mkdir(parents=True, exist_ok=True)

    rows, copied = [], 0
    for root, folder, images in image_folders(roots, not args.no_recurse, out):
        if len(images) < args.min_images:
            continue
        picked = pick_middle(images) if args.by == "name" else pick_median(images)
        if picked is None:
            print(f"  no readable images in {folder}", file=sys.stderr)
            continue
        image, dist = picked
        name = flat_name(root, image)
        print(f"{len(images):5d}  {folder}  ->  {name}")
        rows.append([str(folder), len(images), image.name, name,
                     "" if np.isnan(dist) else f"{dist:.1f}"])
        if not args.dry_run:
            shutil.copy2(image, out / name)
            copied += 1

    if not args.dry_run and rows:
        with open(out / "index.csv", "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["folder", "images", "picked", "copied_as", "distance_to_median"])
            w.writerows(rows)

    verb = "would copy" if args.dry_run else "copied"
    print(f"\n{len(rows)} folders, {verb} {len(rows) if args.dry_run else copied} images"
          + ("" if args.dry_run else f" -> {out}"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
