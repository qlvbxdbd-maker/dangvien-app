// index.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// phục vụ các file tĩnh trong thư mục /public
app.use(express.static('public'));

// Trang chủ: trả về file giao diện index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cổng chạy server
const PORT = process.env.PORT || 3000;

// Kết nối Neon qua biến môi trường DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon yêu cầu SSL
});

// --- Helpers ---
const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// API test server
app.get('/api', (req, res) => {
  res.type('text').send('dangvien-app\n\nAPI is running 🔥');
});

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// DB time (test kết nối DB)
app.get('/db-time', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- API CRUD Members ---

// Lấy danh sách đảng viên
app.get('/members', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM members ORDER BY id');
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Thêm đảng viên mới
app.post('/members', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !isEmail(email)) {
    return res.status(400).json({ error: 'Invalid name or email' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO members(name, email) VALUES($1, $2) RETURNING *',
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Sửa thông tin đảng viên
app.put('/members/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  if (!name || !isEmail(email)) {
    return res.status(400).json({ error: 'Invalid name or email' });
  }
  try {
    const result = await pool.query(
      'UPDATE members SET name=$1, email=$2 WHERE id=$3 RETURNING *',
      [name, email, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Xóa đảng viên
app.delete('/members/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM members WHERE id=$1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
