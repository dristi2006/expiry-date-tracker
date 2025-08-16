const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

exports.scanImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  const imagePath = path.resolve(req.file.path);

  try {
    // Barcode extraction
    const barcodeProc = spawnSync('python', [path.resolve('barcode_reader.py'), imagePath]);
    const barcode = barcodeProc.stdout.toString().trim();

    // Expiry extraction
    const expiryProc = spawnSync('python', [path.resolve('expiry_reader.py'), imagePath]);
    const expiryRaw = expiryProc.stdout.toString();
    // The expiry date will be second-last non-empty line (since we print OCR output for debugging)
    const expiryLines = expiryRaw.split('\n').filter(line => line.trim());
    const expiry_date = expiryLines.length ? expiryLines[expiryLines.length - 1].trim() : null;

    fs.unlinkSync(imagePath);

    res.json({
      message: 'Scan complete',
      data: {
        barcode: barcode || "Not found",
        expiry_date: expiry_date || null
      }
    });
  } catch (err) {
    fs.unlinkSync(imagePath);
    res.status(500).json({ error: "Scan failed", details: err.message });
  }
};
