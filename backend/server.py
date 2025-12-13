"""Offline AI Server (Local) — Indonesian ↔ Banjar

This server performs:
- Text translation (Indo↔Banjar) using a locally stored seq2seq model (mT5 fine-tuned).
- Image scan: OCR (Tesseract) → heuristic language detection → translate.

It does NOT call any external API.

Run:
  python server.py --model models/translator_mt5 --host 127.0.0.1 --port 8000

Endpoints:
- GET  /health
- POST /translate      { text, direction } -> { translatedText }
- POST /analyze-image  { imageBase64 } -> { success, extractedText, detectedLanguage, translatedText, direction, error }
"""

from __future__ import annotations

import argparse
import base64
import re
from io import BytesIO
from pathlib import Path
from typing import Literal, Optional

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

from utils_lang import detect_language_heuristic


TranslateDirection = Literal["id-to-banjar", "banjar-to-id"]
DetectedLanguage = Literal["indonesian", "banjar"]


# -----------------------------
# Helpers
# -----------------------------

def _normalize_spaces(s: str) -> str:
    s = (s or "").replace("\r", " ").replace("\n", " ")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def decode_image_base64(data: str) -> bytes:
    """Accepts either:
    - data URL: data:image/png;base64,XXXX
    - raw base64 string: XXXX
    """
    if not data:
        raise ValueError("imageBase64 wajib diisi")

    if data.startswith("data:"):
        try:
            _, b64 = data.split(",", 1)
        except ValueError:
            raise ValueError("Format data URL tidak valid")
        data = b64

    try:
        return base64.b64decode(data, validate=False)
    except Exception as e:
        raise ValueError("Base64 gambar tidak valid") from e


def load_image(image_bytes: bytes) -> Image.Image:
    img = Image.open(BytesIO(image_bytes))
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    return img


def downscale_for_ocr(img: Image.Image, max_side: int = 1600) -> Image.Image:
    w, h = img.size
    m = max(w, h)
    if m <= max_side:
        return img
    scale = max_side / float(m)
    new_size = (max(1, int(w * scale)), max(1, int(h * scale)))
    return img.resize(new_size)


def ocr_text(img: Image.Image) -> str:
    """Offline OCR via Tesseract.

    Tries Indonesian language pack first (lang="ind"), then falls back.
    """
    import pytesseract

    img = downscale_for_ocr(img)
    config = "--psm 6"

    try:
        text = pytesseract.image_to_string(img, lang="ind", config=config)
    except Exception:
        text = pytesseract.image_to_string(img, config=config)

    return _normalize_spaces(text)


# -----------------------------
# Schemas (match frontend expectations)
# -----------------------------


class TranslateRequest(BaseModel):
    text: str
    direction: TranslateDirection


class TranslateResponse(BaseModel):
    translatedText: str


class AnalyzeImageRequest(BaseModel):
    imageBase64: str


class AnalyzeImageResponse(BaseModel):
    success: bool
    extractedText: Optional[str] = None
    detectedLanguage: Optional[DetectedLanguage] = None
    translatedText: Optional[str] = None
    direction: Optional[TranslateDirection] = None
    error: Optional[str] = None


# -----------------------------
# Model engine
# -----------------------------


class TranslatorEngine:
    def __init__(self, model_dir: str, max_source_len: int = 256, max_new_tokens: int = 256):
        self.model_dir = model_dir
        self.max_source_len = int(max_source_len)
        self.max_new_tokens = int(max_new_tokens)

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        # Model/tokenizer are loaded from disk (fully offline if model_dir is local).
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_dir)
        self.model.to(self.device)
        self.model.eval()

    def translate(self, text: str, direction: TranslateDirection) -> str:
        text = (text or "").strip()
        if not text:
            return ""

        if direction == "id-to-banjar":
            prefix = "translate Indonesian to Banjar: "
        else:
            prefix = "translate Banjar to Indonesian: "

        input_text = prefix + text

        inputs = self.tokenizer(
            input_text,
            return_tensors="pt",
            truncation=True,
            max_length=self.max_source_len,
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            output_ids = self.model.generate(
                **inputs,
                max_new_tokens=self.max_new_tokens,
                num_beams=4,
                early_stopping=True,
                no_repeat_ngram_size=3,
            )

        out = self.tokenizer.decode(output_ids[0], skip_special_tokens=True)
        return (out or "").strip()


# -----------------------------
# FastAPI app
# -----------------------------


def build_app(engine: TranslatorEngine, allow_origins: list[str] | None = None) -> FastAPI:
    app = FastAPI(title="Offline Indo-Banjar Translator", version="2.0")

    allow_origins = allow_origins or ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        return {"ok": True, "device": engine.device, "model": engine.model_dir}

    @app.post("/translate", response_model=TranslateResponse)
    def translate(req: TranslateRequest):
        if not req.text or not req.text.strip():
            return TranslateResponse(translatedText="")
        translated = engine.translate(req.text, req.direction)
        return TranslateResponse(translatedText=translated)

    @app.post("/analyze-image", response_model=AnalyzeImageResponse)
    def analyze_image(req: AnalyzeImageRequest):
        try:
            image_bytes = decode_image_base64(req.imageBase64)
            img = load_image(image_bytes)

            extracted = ocr_text(img)
            if not extracted:
                return AnalyzeImageResponse(success=False, error="Tidak ditemukan teks dalam gambar ini.")

            lang = detect_language_heuristic(extracted)
            direction: TranslateDirection = "id-to-banjar" if lang == "indonesian" else "banjar-to-id"

            translated = engine.translate(extracted, direction)

            return AnalyzeImageResponse(
                success=True,
                extractedText=extracted,
                detectedLanguage=lang,
                translatedText=translated,
                direction=direction,
            )
        except Exception as e:
            return AnalyzeImageResponse(success=False, error=str(e) or "Gagal memproses gambar.")

    return app


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="Path ke folder model hasil training (contoh: models/translator_mt5)")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--max_source_len", type=int, default=256)
    parser.add_argument("--max_new_tokens", type=int, default=256)
    args = parser.parse_args()

    model_path = Path(args.model)
    if not model_path.exists():
        raise SystemExit(f"Model path tidak ditemukan: {model_path}")

    engine = TranslatorEngine(
        str(model_path),
        max_source_len=args.max_source_len,
        max_new_tokens=args.max_new_tokens,
    )

    app = build_app(engine)

    import uvicorn

    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
