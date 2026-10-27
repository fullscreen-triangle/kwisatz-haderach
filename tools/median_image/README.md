# median_image

Shows what is in a pile of image folders without opening any of them. It copies one
representative image per folder into a single preview folder.

```bash
pip install -r tools/median_image/requirements.txt
python -m tools.median_image "D:/Photos" --out "D:/Photos-preview"
python -m tools.median_image "D:/Photos" "E:/Scans" --out preview --dry-run
```

## How it picks

Each image is shrunk to a 16×16 colour thumbnail. The tool takes the pixel-wise **median**
across all the images in a folder and copies the real image that lies closest to that
median. A median ignores outliers, so a single screenshot among 200 beach photos never
gets picked. `--by name` takes the middle file in name order instead. It decodes nothing,
so it is instant even on network drives.

## Output

```
Photos-preview/
  Photos__2023__rome__IMG_0042.jpg     <- the folder path is in the name
  Photos__2023__sea__IMG_0310.jpg
  index.csv                            <- folder, image count, picked file, distance
```

Each folder that directly contains images gets one copy, and subfolders count as separate
folders (`--no-recurse` turns that off). The tool skips hidden folders and the output
folder itself. Unreadable files are reported and skipped. It never modifies the originals.

Formats: jpg, jpeg, png, gif, bmp, tif, tiff and webp. It also reads heic and heif when
`pillow-heif` is installed.
