const express = require("express");
const { Pool } = require("pg");


const app = express();
const PORT = 4000;

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "usage_user",
  password: "usage_pass",
  database: "usage_db",
});

app.get("/health", (req, res) => {
  res.json({ status: "dashboard up" });
});

app.listen(PORT, () => {
  console.log(`Dashboard service running on port ${PORT}`);
});

const cors = require("cors");
app.use(cors());


app.get("/metrics/endpoints", async (req, res) => {
  try {
    const query = `
      SELECT
        service,
        endpoint,
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (WHERE cache_hit = true) AS cache_hits,
        COUNT(*) FILTER (WHERE cache_hit = false) AS cache_misses
      FROM usage_metrics
      WHERE created_at >= NOW() - INTERVAL '5 minutes'
      GROUP BY service, endpoint;
    `;

    const result = await pool.query(query);

    const data = result.rows.map(row => {
      const total = Number(row.total_requests);
      const hits = Number(row.cache_hits);

      return {
        service: row.service,
        endpoint: row.endpoint,
        total_requests: total,
        cache_hits: hits,
        cache_misses: Number(row.cache_misses),
        hit_ratio: total === 0 ? 0 : (hits / total)
      };
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch endpoint metrics" });
  }
});


app.get("/metrics/services", async (req, res) => {
  try {
    const query = `
      SELECT
        service,
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (WHERE cache_hit = true) AS cache_hits
      FROM usage_metrics
      WHERE created_at >= NOW() - INTERVAL '5 minutes'
      GROUP BY service;
    `;

    const result = await pool.query(query);

    const data = result.rows.map(row => {
      const total = Number(row.total_requests);
      const hits = Number(row.cache_hits);

      return {
        service: row.service,
        total_requests: total,
        cache_hits: hits,
        cache_hit_ratio: total === 0 ? 0 : hits / total
      };
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch service metrics" });
  }
});
