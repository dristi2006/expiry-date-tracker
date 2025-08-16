const Item = require('../models/item');

exports.getAllItems = (req, res) => {
  Item.getAll((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.getItemById = (req, res) => {
  const id = req.params.id;
  Item.getById(id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Item not found' });
    res.json(row);
  });
};

exports.createItem = (req, res) => {
  const newItem = req.body;
  if (!newItem.name || !newItem.expiry_date) {
    return res.status(400).json({ error: 'Name and expiry_date are required' });
  }
  Item.create(newItem, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.id, message: 'Item created successfully' });
  });
};

exports.updateItem = (req, res) => {
  const id = req.params.id;
  const updatedItem = req.body;
  Item.update(id, updatedItem, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Item updated successfully' });
  });
};

exports.deleteItem = (req, res) => {
  const id = req.params.id;
  Item.delete(id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Item deleted successfully' });
  });
};
