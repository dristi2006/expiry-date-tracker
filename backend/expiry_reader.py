from PIL import Image
import pytesseract
import sys
import re
import numpy as np
from datetime import datetime, timedelta

# Path to tesseract.exe (required on Windows)
pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'

def preprocess_image(filename):
    img = Image.open(filename).convert('L')
    img_np = np.array(img)
    img_np = (img_np > 130) * 255
    return Image.fromarray(img_np.astype('uint8'))

def parse_date(datestr):
    """Tries multiple date formats, returns datetime or None."""
    fmts = [
        "%d/%m/%Y", "%d-%m-%Y", "%d %b %Y", "%d-%b-%Y",
        "%d/%m/%y", "%d-%m-%y", "%d/%b/%Y", "%d-%b-%Y",
        "%Y-%m-%d", "%Y/%m/%d", "%Y %b %d", "%b %d %Y"
    ]
    for fmt in fmts:
        try:
            return datetime.strptime(datestr, fmt)
        except:
            continue
    return None

def extract_expiry(text):
    # Step 1: Try explicit expiry labels with direct date
    expiry_labels = [
        r'exp\s*date', r'exp\.?\s*date', r'expiry', r'expires', r'use\s*by',
        r'valid\s*till', r'b\.b\.', r'b\.b', r'best before'
    ]
    date_regex = r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|[0-3]?\d[\s\-/.][A-Za-z]{3,}[\s\-/.]\d{2,4}|[A-Za-z]{3,}[\s\-/.]\d{2,4})'
    for label in expiry_labels:
        exp_pattern = rf'{label}[^\n\r:]*{date_regex}'
        match = re.search(exp_pattern, text, re.IGNORECASE)
        if match:
            exp_date_str = match.group(match.lastindex)
            exp_date_dt = parse_date(exp_date_str)
            if exp_date_dt:
                return exp_date_dt.strftime("%d-%m-%Y")

    # Step 2: Calculate relative expiry ("Best Before 90 Days" etc.)
    # Find manufacture or pack date
    mfg_match = re.search(
        r'(manufactured\s*on|mfg\.?\s*date|packed\s*on)[^\d]*([\d]{1,2}[/-][\d]{1,2}[/-][\d]{2,4})',
        text, re.IGNORECASE)
    packed_dt = parse_date(mfg_match.group(2)) if mfg_match else None

    # Robust shelf life - matches "Best Before 90 Days" with/without extra words
    life_match = re.search(
        r'best\s*before\s*(\d+)\s*(day|days|month|months|year|years)',
        text, re.IGNORECASE)
    # Debug (uncomment for checking match):
    # print("MFG match:", mfg_match.group() if mfg_match else "Not found")
    # print("Shelf life match:", life_match.group() if life_match else "Not found")

    if packed_dt and life_match:
        num = int(life_match.group(1))
        unit = life_match.group(2).lower()
        if 'day' in unit:
            expiry_dt = packed_dt + timedelta(days=num)
        elif 'month' in unit:
            expiry_dt = packed_dt + timedelta(days=30*num)
        elif 'year' in unit:
            expiry_dt = packed_dt + timedelta(days=365*num)
        return expiry_dt.strftime("%d-%m-%Y")

    # Step 3: Fallback - latest date present
    all_dates = re.findall(date_regex, text)
    max_year = 0
    expiry = None
    for dt_str in all_dates:
        dt_obj = parse_date(dt_str)
        if dt_obj and dt_obj.year > max_year:
            max_year = dt_obj.year
            expiry = dt_obj
    if expiry:
        return expiry.strftime("%d-%m-%Y")
    return None

if __name__ == "__main__":
    filename = sys.argv[1]
    img = preprocess_image(filename)
    text = pytesseract.image_to_string(img)
    expiry = extract_expiry(text)
    if expiry:
        print(expiry)
    else:
        print("")
