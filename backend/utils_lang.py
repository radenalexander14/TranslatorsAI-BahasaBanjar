import re

BANJAR_KEYWORDS = {
    "kada", "handak", "pian", "ikam", "napa", "kayapa", "tulak", "baisi",
    "bahari", "kaina", "nyaman", "ulun", "sidin", "kawa", "kada", "aja"
}

def normalize_text(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    return s

def detect_language_heuristic(text: str) -> str:
    """Return: 'indonesian' | 'banjar'

    Heuristik sederhana: hitung kemunculan kata-kata khas Banjar.
    Kalau skor Banjar cukup kuat, anggap Banjar; selain itu Indonesian.

    (Karena tidak ada detector Banjar standar yang reliable offline.)
    """
    t = normalize_text(text)
    tokens = re.findall(r"[a-zA-ZÀ-ÿ']+", t)
    if not tokens:
        return "indonesian"

    hits = sum(1 for w in tokens if w in BANJAR_KEYWORDS)
    ratio = hits / max(len(tokens), 1)

    # aturan praktis
    if hits >= 2 or ratio >= 0.08:
        return "banjar"
    return "indonesian"
