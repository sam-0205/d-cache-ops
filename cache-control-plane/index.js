const { Pool } = require("pg");
const axios = require("axios");
const cron = require("node-cron");

const THRESHOLDS = {
  MIN_REQUESTS: 20,
  MIN_MISSES: 10,
};

const SERVICE_ENDPOINTS = {
  "product-service": "http://localhost:3001",
  "user-service": "http://localhost:3002",
};



const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "usage_user",
  password: "usage_pass",
  database: "usage_db",
});

async function getEndpointStats() {
  const query = `
    SELECT
  service,
  endpoint,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE cache_hit = false) AS cache_misses
FROM usage_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
GROUP BY service, endpoint;

  `;

  const result = await pool.query(query);
  return result.rows;
}

function decideCacheRules(stats) {
  const rules = [];

  for (const row of stats) {
    const totalRequests = Number(row.total_requests);
    const cacheMisses = Number(row.cache_misses);

    if (
      totalRequests >= THRESHOLDS.MIN_REQUESTS &&
      cacheMisses >= THRESHOLDS.MIN_MISSES
    ) {
      rules.push({
        service: row.service,
        endpoint: row.endpoint,
        ttl: 120
      });

    }
  }

  return rules;
}

async function pushRulesToService(rules) {
  for (const rule of rules) {
    const serviceUrl = SERVICE_ENDPOINTS[rule.service];

    if (!serviceUrl) {
      console.log("Unknown service, skipping:", rule.service);
      continue;
    }

    try {
      await axios.post(`${serviceUrl}/cache/update-rules`, rule);
      console.log("Pushed cache rule:", rule);
    } catch (err) {
      console.error("Failed to push rule:", rule.service, err.message);
    }
  }
}



console.log("Cache Control Plane started");



cron.schedule("*/60 * * * * *", async () => {
  console.log("Running cache control cycle...");

  const stats = await getEndpointStats();
  const rules = decideCacheRules(stats);

  if (rules.length === 0) {
    console.log("No cache rules to apply");
    return;
  }

  await pushRulesToService(rules);
});
