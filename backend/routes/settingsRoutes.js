const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.sqlite');

// GET user settings
router.get('/', requireAuth, (req, res) => {
  db.get('SELECT settings FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'No user found' });
    let settings = {};
    if (row.settings) {
      try { settings = JSON.parse(row.settings); } catch { settings = {}; }
    }
    res.json(settings);
  });
});

// POST/PUT user settings
router.post('/', requireAuth, (req, res) => {
  const settings = JSON.stringify(req.body || {});
  db.run('UPDATE users SET settings = ? WHERE id = ?', [settings, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to save settings' });
    res.json({ success: true });
  });
});

module.exports = router;
