const Reminder = require('../models/reminder');

exports.getAllReminders = (req, res) => {
  Reminder.getAll((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.getReminderByItemId = (req, res) => {
  const item_id = req.params.item_id;
  Reminder.getByItemId(item_id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Reminder not found' });
    res.json(row);
  });
};

exports.createReminder = (req, res) => {
  const newReminder = req.body;
  if (!newReminder.item_id || newReminder.days_before == null || !newReminder.notify_time) {
    return res.status(400).json({ error: 'item_id, days_before, and notify_time are required' });
  }
  Reminder.create(newReminder, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.id, message: 'Reminder created successfully' });
  });
};

exports.updateReminder = (req, res) => {
  const id = req.params.id;
  const updatedReminder = req.body;
  Reminder.update(id, updatedReminder, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Reminder updated successfully' });
  });
};

exports.deleteReminder = (req, res) => {
  const id = req.params.id;
  Reminder.delete(id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Reminder deleted successfully' });
  });
};
