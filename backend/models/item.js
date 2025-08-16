const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.sqlite');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT,
      expiry_date TEXT NOT NULL,
      quantity INTEGER DEFAULT 1
    )
  `);
});

module.exports = {
  getAll(callback) {
    db.all('SELECT * FROM items', callback);
  },
  getById(id, callback) {
    db.get('SELECT * FROM items WHERE id = ?', [id], callback);
  },
  create(item, callback) {
    const { name, barcode, expiry_date, quantity } = item;
    db.run(
      'INSERT INTO items (name, barcode, expiry_date, quantity) VALUES (?, ?, ?, ?)',
      [name, barcode, expiry_date, quantity || 1],
      function (err) {
        callback(err, { id: this.lastID });
      }
    );
  },
  update(id, item, callback) {
    const { name, barcode, expiry_date, quantity } = item;
    db.run(
      'UPDATE items SET name = ?, barcode = ?, expiry_date = ?, quantity = ? WHERE id = ?',
      [name, barcode, expiry_date, quantity || 1, id],
      callback
    );
  },
  delete(id, callback) {
    db.run('DELETE FROM items WHERE id = ?', [id], callback);
  }
};
