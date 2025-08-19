"""
Expiry Date OCR Extractor
-------------------------
Reads expiry/manufacturing info from product label images using Tesseract OCR.

Priorities:
  1) Explicit expiry-labelled dates (EXP / Use by / Best before date).
  2) Derived from MFG/PKD + "Best Before N days/months/years".
  3) Fallback: latest plausible date in text (never MFG-only if BB duration exists).
"""

import sys
import re
import numpy as np
import cv2
import pytesseract
from datetime import datetime, timedelta
import calendar
from PIL import Image

# --- Adjust if needed (Windows) ---
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# ========= IMAGE PREPROCESSING =========
def preprocess_image(filename):
    """Preprocess image to improve OCR accuracy."""
    img = cv2.imread(filename)
    if img is None:  # fallback for unusual formats
        return Image.open(filename).convert("L")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise
    gray = cv2.fastNlMeansDenoising(gray, None, 15, 7, 21)

    # Sharpen
    kernel = np.array([[0, -1, 0],
                       [-1, 5, -1],
                       [0, -1, 0]], dtype=np.float32)
    sharp = cv2.filter2D(gray, -1, kernel)

    # Adaptive threshold (handles uneven lighting)
    thr = cv2.adaptiveThreshold(
        sharp, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 21, 9
    )

    return Image.fromarray(thr)


# ========= OCR MULTI-PASS =========
def run_ocr_with_multiple_configs(img):
    """Run OCR with multiple configs for better recall."""
    configs = [
        r'--oem 3 --psm 6',
        r'--oem 3 --psm 7',
        r'--oem 3 --psm 4',
        r'--oem 3 --psm 11',
    ]
    results = []

    for cfg in configs:
        try:
            text = pytesseract.image_to_string(img, config=cfg)
            if text.strip():
                results.append(text.strip())
        except Exception:
            continue

    # Extra high-contrast pass
    try:
        arr = np.array(img)
        arr = cv2.convertScaleAbs(arr, alpha=1.6, beta=0)
        text = pytesseract.image_to_string(Image.fromarray(arr), config=r'--oem 3 --psm 6')
        if text.strip():
            results.append(text.strip())
    except Exception:
        pass

    return "\n".join(results)


# ========= HELPERS =========
def normalize_for_date_token(s: str) -> str:
    """Fix common OCR digit/letter confusions inside date tokens."""
    return s.translate(str.maketrans({
        'O': '0', 'o': '0',
        'I': '1', 'l': '1',
        'B': '8',
        'Z': '2',
        'S': '5'
    }))


def month_to_num(m: str):
    """Convert month string to month number."""
    m = m.lower()
    months = {
        "jan": 1, "january": 1,
        "feb": 2, "february": 2,
        "mar": 3, "march": 3,
        "apr": 4, "april": 4,
        "may": 5,
        "jun": 6, "june": 6,
        "jul": 7, "july": 7,
        "aug": 8, "august": 8,
        "sep": 9, "sept": 9, "september": 9,
        "oct": 10, "october": 10,
        "nov": 11, "november": 11,
        "dec": 12, "december": 12,
    }
    for k, v in months.items():
        if m.startswith(k):
            return v
    return None


def last_day_of_month(year: int, month: int) -> int:
    return calendar.monthrange(year, month)[1]


def parse_date_string(s: str):
    """Try to parse various date formats into datetime."""
    if not s:
        return None

    s = s.strip().replace('—', '-').replace('–', '-')
    s = re.sub(r'[^0-9A-Za-z/\-\. ]', ' ', s)
    token = normalize_for_date_token(s)

    # 1) DD/MM/YYYY or DD-MM-YY
    m = re.search(r'\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})\b', token)
    if m:
        d, mo, y = map(int, m.groups())
        if y < 100:  # normalize 2-digit years
            y = 2000 + y if y < 50 else 1900 + y
        try:
            return datetime(y, mo, d)
        except ValueError:
            pass

    # 2) YYYY/MM/DD
    m = re.search(r'\b(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})\b', token)
    if m:
        y, mo, d = map(int, m.groups())
        try:
            return datetime(y, mo, d)
        except ValueError:
            pass

    # 3) DD MMM YYYY or DDMMMYYYY
    m = re.search(r'\b(\d{1,2})\s*([A-Za-z]{3,9})\s*(\d{2,4})\b', token)
    if m:
        d, mstr, y = m.groups()
        mo = month_to_num(mstr)
        if mo:
            y = int(y)
            if y < 100:
                y = 2000 + y if y < 50 else 1900 + y
            try:
                return datetime(y, mo, int(d))
            except ValueError:
                pass

    # 4) MM/YYYY -> last day of month
    m = re.search(r'\b(\d{1,2})[\/\-](\d{4})\b', token)
    if m:
        mo, y = map(int, m.groups())
        if 1 <= mo <= 12:
            d = last_day_of_month(y, mo)
            try:
                return datetime(y, mo, d)
            except ValueError:
                pass

    # 5) MMM YYYY -> last day of month
    m = re.search(r'\b([A-Za-z]{3,9})\s*(\d{4})\b', token)
    if m:
        mstr, y = m.groups()
        mo = month_to_num(mstr)
        if mo:
            y = int(y)
            d = last_day_of_month(y, mo)
            try:
                return datetime(y, mo, d)
            except ValueError:
                pass

    return None


def is_mfg_line(line: str) -> bool:
    return bool(re.search(
        r'\b(mfg|mfd|manufactur(?:ed|e)?|manuf|pkd|packed|pack\s*date|pkgd|packed\s*on)\b',
        line, re.I))


def is_expiry_line(line: str) -> bool:
    return bool(re.search(
        r'\b(e[xs][pfr]\b|e[xs][pfr]iry|expires?|valid\s*till|use\s*by|sell\s*by|best\s*before|bbe|b\/b)\b',
        line, re.I))


def find_all_dates(line: str):
    """Extract all date-like tokens from a line."""
    candidates, seen = [], set()
    parts = re.findall(r'[A-Za-z0-9]{1,4}[A-Za-z]{0,9}[0-9]{0,4}'
                       r'|[0-9]{1,4}[\/\-\.][0-9A-Za-z]{1,9}[\/\-\.]?[0-9]{0,4}', line)
    parts.append(line)

    for p in parts:
        p = p.strip()
        if not p or p in seen:
            continue
        seen.add(p)
        dt = parse_date_string(p)
        if dt:
            candidates.append(dt)
    return candidates


# ========= CORE EXTRACTION =========
def extract_expiry_date(text: str, debug: bool = False):
    if not text:
        return None

    lines = [re.sub(r'\s+', ' ', ln.strip()) for ln in text.splitlines() if ln.strip()]
    expiry_candidates, mfg_dates, bb_durations = [], [], []

    for ln in lines:
        # --- Manufacturing dates ---
        if is_mfg_line(ln):
            dts = find_all_dates(ln)
            if dts:
                mfg_dates.append(max(dts))
                if debug:
                    print(f"[DEBUG] MFG line: {ln} -> {mfg_dates[-1].strftime('%d-%m-%Y')}")

        # --- Explicit expiry dates ---
        if is_expiry_line(ln):
            dts = find_all_dates(ln)
            for dt in dts:
                expiry_candidates.append(("labelled", dt, ln))
                if debug:
                    print(f"[DEBUG] EXP line: {ln} -> {dt.strftime('%d-%m-%Y')}")

        # --- "Best Before N units" ---
        m = re.search(r'best\s*bef[o0]re[^0-9]*(\d+)\s*(day|days|month|months|year|years|m|y)\b', ln, re.I)
        if m:
            n, unit_raw = int(m.group(1)), m.group(2).lower()
            unit = "day" if unit_raw.startswith('d') else ("month" if unit_raw.startswith('m') else "year")
            bb_durations.append((n, unit))
            if debug:
                print(f"[DEBUG] BB duration: {ln} -> {n} {unit}")

    # --- Compute expiry from MFG + Best Before ---
    for mfg in mfg_dates:
        for n, unit in bb_durations:
            if unit == "day":
                dt = mfg + timedelta(days=n)
            elif unit == "month":
                dt = mfg + timedelta(days=30 * n)  # approx
            else:
                dt = mfg + timedelta(days=365 * n)
            expiry_candidates.append(("bestbefore", dt, f"MFG {mfg.strftime('%d-%m-%Y')} + {n} {unit}"))
            if debug:
                print(f"[DEBUG] Computed BB expiry: {dt.strftime('%d-%m-%Y')}")

    # --- Decide best candidate ---
    if expiry_candidates:
        expiry_candidates.sort(key=lambda c: (0 if c[0] == "labelled" else 1, c[1]))
        best = expiry_candidates[0][1]
        return best.strftime("%d-%m-%Y")

    # --- Fallback: latest date ---
    all_dates = []
    for ln in lines:
        all_dates.extend(find_all_dates(ln))

    if all_dates:
        if bb_durations and mfg_dates and set(all_dates).issubset(set(mfg_dates)):
            return None  # don't return bare MFG if BB phrase exists
        return max(all_dates).strftime("%d-%m-%Y")

    return None


# ========= CLI =========
def main():
    if len(sys.argv) < 2:
        print("Usage: python expiry_reader.py <image_file> [--debug]")
        sys.exit(1)

    filename = sys.argv[1]
    debug = ("--debug" in sys.argv)

    try:
        img = preprocess_image(filename)
        text = run_ocr_with_multiple_configs(img)
        if debug:
            print("------ OCR TEXT ------")
            print(text)
            print("----------------------")
        expiry = extract_expiry_date(text, debug=debug)
        print(expiry if expiry else "NOT DETECTED")
    except Exception as e:
        print(f"ERROR: {e}")
        print("NOT DETECTED")


if __name__ == "__main__":
    main()
