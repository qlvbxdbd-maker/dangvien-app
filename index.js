const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000; // Render sẽ tự set PORT

// Kết nối Neon qua biến môi trường DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Neon yêu cầu SSL
});

// Route trang chủ
app.get('/', (req, res) => {
  res.send('<h1>dangvien-app</h1><p>API is running 👍</p>');
});

// Route kiểm tra sức khỏe
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Route test database
app.get('/db-time', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT now() AS now');
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Route lấy danh sách members
app.get('/members', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM members ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${PORT}`);
});

