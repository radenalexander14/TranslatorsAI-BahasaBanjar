FROM python:3.11-slim

# System deps: tesseract OCR + Indonesian pack
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-ind \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# PyTorch CPU (for GPU, use NVIDIA base images and proper wheels)
RUN pip install --no-cache-dir torch torchvision torchaudio

COPY . ./

EXPOSE 8000

CMD ["python", "server.py", "--model", "models/translator_mt5", "--host", "0.0.0.0", "--port", "8000"]
