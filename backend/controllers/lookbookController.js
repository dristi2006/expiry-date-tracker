const Lookbook = require('../models/lookbook');

exports.getAllLookbook = (req, res) => {
  Lookbook.getAll((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.getLookbookByItemName = (req, res) => {
  const item_name = req.params.item_name;
  Lookbook.getByItemName(item_name, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Lookbook entry not found' });
    res.json(row);
  });
};
