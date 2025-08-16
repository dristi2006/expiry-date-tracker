from pyzbar.pyzbar import decode
from PIL import Image
import cv2
import sys
import numpy as np

filename = sys.argv[1]

# Load image with OpenCV
img_cv = cv2.imread(filename, cv2.IMREAD_GRAYSCALE)

# Increase contrast and sharpness
img_cv = cv2.equalizeHist(img_cv)    # Histogram equalization
img_cv = cv2.GaussianBlur(img_cv, (3,3), 0)  # Optional light blur to clean noise

# Threshold to binarize (pure black and white)
_, img_cv = cv2.threshold(img_cv, 120, 255, cv2.THRESH_BINARY)

# Save processed for inspection (optional)
cv2.imwrite('processed_barcode.png', img_cv)

# Convert back to PIL for pyzbar
img = Image.fromarray(img_cv)

barcodes = decode(img)
for item in barcodes:
    print(item.data.decode('utf-8'))
