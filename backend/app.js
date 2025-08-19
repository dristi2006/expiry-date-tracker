const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const itemRoutes = require('./routes/itemRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const lookbookRoutes = require('./routes/lookbookRoutes');
const userRoutes = require('./routes/user');
const settingsRoutes = require('./routes/settingsRoutes');
const sendEmail = require("./utils/sendEmail");

const app = express();
const PORT = process.env.PORT || 3001;

const multer = require('multer');
const { spawnSync } = require('child_process');
const path = require('path');

const upload = multer({ dest: 'uploads/' });


app.use(cors());
app.use(bodyParser.json());

// API routes
app.use('/api/items', itemRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/lookbook', lookbookRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('Grocery Expiry Tracker Backend Running');
});

app.post('/scan-expiry', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imagePath = path.resolve(req.file.path);

  const expiryProc = spawnSync('python', ['expiry_reader.py', imagePath]);
  const expiry = expiryProc.stdout.toString().trim();

  res.json({ expiry_date: expiry });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
