const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const port = 3000;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "demo",
  password: process.env.DB_PASSWORD || "demo123",
  database: process.env.DB_NAME || "demo"
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ratings (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

// (users endpoints removed) Ratings endpoints remain

// Submit a rating: { first_name, last_name, rating }
app.post("/api/ratings", async (req, res) => {
  const { first_name, last_name, rating } = req.body;

  if (!first_name || !first_name.trim() || !last_name || !last_name.trim()) {
    return res.status(400).json({ error: "first_name and last_name are required" });
  }

  const parsed = Number(rating);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return res.status(400).json({ error: "rating must be an integer between 1 and 5" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO ratings (first_name, last_name, rating) VALUES ($1, $2, $3) RETURNING id, first_name, last_name, rating, created_at",
      [first_name.trim(), last_name.trim(), parsed]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Insert rating failed", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

// Get all ratings
app.get("/api/ratings", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, first_name, last_name, rating, created_at FROM ratings ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database query failed" });
  }
});

// Get ratings summary (counts and percentages for 1..5)
app.get("/api/ratings-summary", async (req, res) => {
  try {
    const countsRes = await pool.query(
      "SELECT rating, COUNT(*) AS cnt FROM ratings GROUP BY rating"
    );
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    for (const row of countsRes.rows) {
      const r = Number(row.rating);
      const c = Number(row.cnt);
      if (r >= 1 && r <= 5) {
        counts[r] = c;
        total += c;
      }
    }

    const percentages = {};
    for (let r = 1; r <= 5; r++) {
      percentages[r] = total === 0 ? 0 : Math.round((counts[r] / total) * 100);
    }

    res.json({ total, counts, percentages });
  } catch (err) {
    console.error("Ratings summary failed", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

async function start() {
  await initDb();
  app.listen(port, "0.0.0.0", () => {
    console.log(`Backend listening on port ${port}`);
  });
}

start().catch((err) => {
  console.error("Startup failed:", err);
  process.exit(1);
});
