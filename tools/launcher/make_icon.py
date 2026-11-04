"""agent-smith.ico from the PWA's icon (web/public/icons), in the sizes Windows shows.

    python tools/launcher/make_icon.py OUT.ico
"""

import io
import sys
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parents[2] / "web" / "public" / "icons" / "agent-smith-512.png"

if __name__ == "__main__":
    out = Path(sys.argv[1])
    Image.open(SRC).convert("RGBA").save(out, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(out)
