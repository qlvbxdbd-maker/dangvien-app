// index.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Kết nối Neon qua biến môi trường DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon yêu cầu SSL
});

// --- Helpers ---
const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Trang chủ đơn giản
app.get('/', (req, res) => {
  res.type('text').send('dangvien-app\n\nAPI is running 🔥');
});

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// DB time (test kết nối DB)
app.get('/db-time', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT now() AS now');
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// --------------- MEMBERS CRUD -----------------

// GET /members?searchEmail=...&page=1&pageSize=20
app.get('/members', async (req, res) => {
  try {
    const { searchEmail = '', page = 1, pageSize = 50 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const sizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 50, 1), 200);
    const offset = (pageNum - 1) * sizeNum;

    let where = '';
    const params = [];

    if (searchEmail) {
      where = 'WHERE email ILIKE $1';
      params.push(`%${searchEmail}%`);
    }

    // Lấy tổng bản ghi
    const countSql = `SELECT COUNT(*)::int AS total FROM members ${where}`;
    const countRs = await pool.query(countSql, params);
    const total = countRs.rows[0]?.total || 0;

    // Lấy danh sách theo trang
    const listSql = `
      SELECT id, name, email, joined_at
      FROM members
      ${where}
      ORDER BY id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const listParams = params.concat([sizeNum, offset]);

    const { rows } = await pool.query(listSql, listParams);
    res.json({ data: rows, paging: { page: pageNum, pageSize: sizeNum, total } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// GET /members/:id
app.get('/members/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const { rows } = await pool.query(
      'SELECT id, name, email, joined_at FROM members WHERE id=$1',
      [id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// POST /members  { name, email }
app.post('/members', async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'name & email are required' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Invalid email' });

    const insertSql = `
      INSERT INTO members (name, email, joined_at)
      VALUES ($1, $2, NOW())
      RETURNING id, name, email, joined_at
    `;
    const { rows } = await pool.query(insertSql, [name.trim(), email.trim()]);
    res.status(201).json(rows[0]);
  } catch (err) {
    // Unique violation (email)
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// PUT /members/:id  { name?, email? }
app.put('/members/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const { name, email } = req.body || {};
    if (!name && !email) {
      return res.status(400).json({ error: 'Nothing to update' });
    }
    if (email && !isEmail(email)) return res.status(400).json({ error: 'Invalid email' });

    // Build dynamic set
    const sets = [];
    const params = [];
    let p = 1;
    if (name) {
      sets.push(`name=$${p++}`);
      params.push(name.trim());
    }
    if (email) {
      sets.push(`email=$${p++}`);
      params.push(email.trim());
    }
    params.push(id);

    const updateSql = `
      UPDATE members
      SET ${sets.join(', ')}
      WHERE id=$${p}
      RETURNING id, name, email, joined_at
    `;
    const { rows } = await pool.query(updateSql, params);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// DELETE /members/:id
app.delete('/members/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const { rowCount } = await pool.query('DELETE FROM members WHERE id=$1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
