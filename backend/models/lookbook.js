const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.sqlite');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS lookbook (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      disposal_method TEXT NOT NULL
    )
  `);
  db.get('SELECT COUNT(*) as count FROM lookbook', [], (err, row) => {
    if (err) return;
    if (row.count === 0) {
      const sampleData = [
        ['Milk', 'Pour down drain if expired, then clean container before recycling.'],
        ['Bread', 'Compost if possible, otherwise discard in trash.'],
        ['Canned Goods', 'Recycle can after emptying contents, discard spoiled contents.']
      ];
      sampleData.forEach(([item_name, disposal_method]) => {
        db.run('INSERT INTO lookbook (item_name, disposal_method) VALUES (?, ?)', [item_name, disposal_method]);
      });
    }
  });
});

module.exports = {
  getAll(callback) {
    db.all('SELECT * FROM lookbook', callback);
  },
  getByItemName(item_name, callback) {
    db.get('SELECT * FROM lookbook WHERE item_name = ?', [item_name], callback);
  },
  create(data, callback) {
    const { item_name, disposal_method } = data;
    db.run(
      'INSERT INTO lookbook (item_name, disposal_method) VALUES (?, ?)',
      [item_name, disposal_method],
      function (err) {
        callback(err, { id: this.lastID });
      }
    );
  }
};
