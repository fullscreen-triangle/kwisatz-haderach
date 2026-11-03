"""
Reading a scanned PDF: the node has no OCR, so a vision model transcribes the page images.

Only for forms that allow cloud models — the scan is sent to the model's provider. A model
can misread a digit, so text read this way is its own channel ("scan", reliability 0.8 in
backend/memory/observe.py) and a quote from it counts for less than one from a typed
document; the quote check (verbatim in the transcription) still applies.
"""

from __future__ import annotations

import io
from typing import List, Tuple

from backend.primitive.route import ChatError, provider_of

MODELS = ["openai/gpt-5.5", "gemini/gemini-3.5-flash"]
MAX_PAGES = 8
MIN_IMAGE = 20_000            # bytes; smaller images are logos and stamps, not pages
PROMPT = ("Transcribe this scanned document exactly, in its original language, page by page. Keep every "
          "number, date, name, address and code character for character, and keep the labels next to "
          "their values (e.g. 'Steuer-ID: …'). Mark anything you cannot read as [unreadable]. No commentary.")
MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "jp2": "image/jp2", "tif": "image/tiff",
        "tiff": "image/tiff", "webp": "image/webp"}


def page_images(data: bytes) -> List[Tuple[str, bytes]]:
    from pypdf import PdfReader
    out = []
    for page in PdfReader(io.BytesIO(data)).pages[:MAX_PAGES]:
        try:
            imgs = sorted(page.images, key=lambda im: len(im.data), reverse=True)
        except Exception:
            continue
        if imgs and len(imgs[0].data) >= MIN_IMAGE:
            ext = imgs[0].name.rsplit(".", 1)[-1].lower()
            mime = MIME.get(ext)
            if mime in ("image/jpeg", "image/png", "image/webp"):
                out.append((mime, imgs[0].data))
            else:                                      # convert what vision APIs do not take
                try:
                    from PIL import Image
                    buf = io.BytesIO()
                    imgs[0].image.convert("RGB").save(buf, format="JPEG", quality=85)
                    out.append(("image/jpeg", buf.getvalue()))
                except Exception:
                    continue
    return out


async def transcribe(data: bytes, providers) -> Tuple[str, str]:
    """(text, model) — or ("", reason) when it could not be read."""
    images = page_images(data)
    if not images:
        return "", "no page images in this PDF"
    errors = []
    for m in MODELS:
        if provider_of(m) in providers.refused():
            continue
        try:
            text = await providers.chat_images(m, PROMPT, images)
        except ChatError as e:
            errors.append(f"{m}: {e}")
            continue
        if text.strip():
            return text, m
    return "", "; ".join(errors) or "no vision model answered"
