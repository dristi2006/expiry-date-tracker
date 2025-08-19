const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.sqlite');

// CREATE TABLE must include user_id as above (see step 1).

module.exports = {
  // Get ALL items for a user
  getAll(user_id, callback) {
    db.all('SELECT * FROM items WHERE user_id = ?', [user_id], callback);
  },
  // Get one item (for security, use id AND user_id!)
  getById(id, user_id, callback) {
    db.get('SELECT * FROM items WHERE id = ? AND user_id = ?', [id, user_id], callback);
  },
  // Create item for a user
  create(item, user_id, callback) {
    const {
      name, brand, barcode, expiry_date, quantity, unit, category,
      location, is_priority, notes
    } = item;
    db.run(
      `INSERT INTO items (
        name, brand, barcode, expiry_date, quantity, unit, category, location, is_priority, notes, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        brand || null,
        barcode || null,
        expiry_date,
        quantity || 1,
        unit || null,
        category || null,
        location || null,
        is_priority ? 1 : 0,
        notes || null,
        user_id
      ],
      function (err) {
        callback(err, { id: this.lastID });
      }
    );
  },
  // Update item for a user (ensure only the owner can do this)
  update(id, item, user_id, callback) {
    const {
      name, brand, barcode, expiry_date, quantity, unit, category,
      location, is_priority, notes
    } = item;
    db.run(
      `UPDATE items
       SET name = ?, brand = ?, barcode = ?, expiry_date = ?, quantity = ?, unit = ?, category = ?, location = ?, is_priority = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [
        name,
        brand || null,
        barcode || null,
        expiry_date,
        quantity || 1,
        unit || null,
        category || null,
        location || null,
        is_priority ? 1 : 0,
        notes || null,
        id,
        user_id
      ],
      callback
    );
  },
  // Delete item for a user (must check user_id for security!)
  delete(id, user_id, callback) {
    db.run('DELETE FROM items WHERE id = ? AND user_id = ?', [id, user_id], callback);
  }
};
