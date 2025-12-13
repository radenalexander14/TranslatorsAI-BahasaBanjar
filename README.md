# Indo ↔ Banjar Translator (Offline, Train Your Own Dataset)

Project ini adalah versi **offline** dari aplikasi Translator Indo–Banjar dengan fitur:
- Translate teks (auto-translate + tombol manual)
- Swap bahasa (Indo ↔ Banjar)
- Copy hasil
- Text-to-Speech (Web Speech API di browser)
- Scan foto: OCR (Tesseract) → translate

✅ Tidak memakai Gemini/Lovable/Supabase/Internet untuk inference.
✅ Model berjalan lokal (hasil training dataset kamu sendiri).

---

# Struktur Folder
- `frontend/` : UI (React + Vite + Tailwind + shadcn)
- `backend/` : FastAPI server (OCR + LLM translation)
- `docker-compose.yml` : opsi deploy (self-host)

---

# 1) Mulai dari mana? (Paling gampang)

## Langkah 1 — Jalankan backend (server AI lokal)
1. Buka terminal:
   ```bash
   cd backend
   ```
2. Buat virtual env:
   - Windows (PowerShell):
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   - Linux/macOS:
     ```bash
     python -m venv .venv
     source .venv/bin/activate
     ```
3. Install dependency:
   ```bash
   pip install -r requirements.txt
   ```
4. Install PyTorch (pilih sesuai device kamu):
   - CPU contoh:
     ```bash
     pip install torch torchvision torchaudio
     ```
5. Install Tesseract OCR:
   - Ubuntu:
     ```bash
     sudo apt install tesseract-ocr tesseract-ocr-ind
     ```
   - macOS:
     ```bash
     brew install tesseract
     ```
   - Windows: install Tesseract OCR lalu masukkan ke PATH

## Langkah 2 — Training model (pakai dataset kamu)
> Dataset starter sudah ada di `backend/data/dataset.csv` (sintetis untuk demo). Untuk kualitas bagus, ganti dengan dataset asli kamu.

1. Masih di folder `backend` (venv aktif), jalankan:
   ```bash
   python train_mt5.py --data data/dataset.csv --base_model google/mt5-small --out models/translator_mt5
   ```
2. Setelah selesai, model akan muncul di:
   - `backend/models/translator_mt5/`

## Langkah 3 — Jalankan server
```bash
python server.py --model models/translator_mt5 --host 127.0.0.1 --port 8000
```
Cek:
- `http://127.0.0.1:8000/health`

## Langkah 4 — Jalankan frontend
Buka terminal baru:
```bash
cd frontend
npm install
npm run dev
```
Buka:
- `http://localhost:8080`

---

# 2) Dataset: letaknya dimana?
- Dataset berada di: `backend/data/dataset.csv`
- Format wajib: `source,target,direction`
- `direction` harus salah satu: `id-to-banjar` atau `banjar-to-id`

---

# 3) Cara Deploy (Self-host, tanpa API luar)
Ada 2 cara:

## Opsi A — Deploy manual (VPS/Linux)
1. Upload folder project ke server.
2. Backend:
   - Siapkan Python + venv + dependency + PyTorch + Tesseract
   - Jalankan:
     ```bash
     cd backend
     source .venv/bin/activate
     python server.py --model models/translator_mt5 --host 0.0.0.0 --port 8000
     ```
3. Frontend:
   ```bash
   cd frontend
   bun install
   bun run build
   ```
   Hasil build ada di `frontend/dist/`.
4. Pasang Nginx:
   - serve folder `frontend/dist`
   - proxy `/api/*` ke `http://127.0.0.1:8000/*`

## Opsi B — Deploy pakai Docker Compose (disarankan)
1. Pastikan Docker terinstall.
2. Jalankan:
   ```bash
   docker compose up --build
   ```
3. Buka:
   - `http://localhost:8080`

---

# Catatan penting
- Training model pertama kali biasanya butuh internet untuk download base model (`google/mt5-small`). Setelah model tersimpan di `backend/models/`, inference bisa offline.
- Dataset starter adalah sintetis (untuk uji pipeline). Untuk terjemahan Indo↔Banjar yang bagus, gunakan dataset paralel asli.
