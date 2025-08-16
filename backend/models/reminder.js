const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.sqlite');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER,
      days_before INTEGER,
      notify_time TEXT,
      method TEXT,
      FOREIGN KEY(item_id) REFERENCES items(id)
    )
  `);
});

module.exports = {
  getAll(callback) {
    db.all('SELECT * FROM reminders', callback);
  },
  getByItemId(item_id, callback) {
    db.get('SELECT * FROM reminders WHERE item_id = ?', [item_id], callback);
  },
  create(reminder, callback) {
    const { item_id, days_before, notify_time, method } = reminder;
    db.run(
      'INSERT INTO reminders (item_id, days_before, notify_time, method) VALUES (?, ?, ?, ?)',
      [item_id, days_before, notify_time, method],
      function (err) {
        callback(err, { id: this.lastID });
      }
    );
  },
  update(id, reminder, callback) {
    const { item_id, days_before, notify_time, method } = reminder;
    db.run(
      'UPDATE reminders SET item_id = ?, days_before = ?, notify_time = ?, method = ? WHERE id = ?',
      [item_id, days_before, notify_time, method, id],
      callback
    );
  },
  delete(id, callback) {
    db.run('DELETE FROM reminders WHERE id = ?', [id], callback);
  }
};
