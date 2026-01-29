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

async function getEndpointStats(windowMinutes) {
    const query = `
    SELECT
      service,
      endpoint,
      COUNT(*) AS total_requests,
      COUNT(*) FILTER (WHERE cache_hit = false) AS cache_misses
    FROM usage_metrics
    WHERE created_at >= NOW() - INTERVAL '${windowMinutes} minutes'
    GROUP BY service, endpoint;
  `;

    const result = await pool.query(query);
    return result.rows;
}


function decideCacheRules(stats5m, stats15m) {
    const rules = [];

    const map15m = new Map();
    for (const row of stats15m) {
        map15m.set(`${row.service}:${row.endpoint}`, row);
    }

    for (const row of stats5m) {
        const key = `${row.service}:${row.endpoint}`;
        const older = map15m.get(key);

        const total5 = Number(row.total_requests);
        const miss5 = Number(row.cache_misses);
        const missRatio5 = total5 > 0 ? miss5 / total5 : 0;

        const total15 = older ? Number(older.total_requests) : total5;
        const miss15 = older ? Number(older.cache_misses) : miss5;
        const missRatio15 = total15 > 0 ? miss15 / total15 : missRatio5;

        const trafficWeight = Math.min(total5 / 100, 1);

        const score =
            (missRatio5 * 0.6) +
            (missRatio15 * 0.3) +
            (trafficWeight * 0.1);

        if (score < 0.3) continue;

        let ttl;
        if (score < 0.6) ttl = 60;
        else ttl = 300;

        rules.push({
            service: row.service,
            endpoint: row.endpoint,
            ttl,
            score: Number(score.toFixed(2))
        });
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

    const stats5m = await getEndpointStats(5);
    const stats15m = await getEndpointStats(15);

    const rules = decideCacheRules(stats5m, stats15m);

    if (rules.length === 0) {
        console.log("No cache rules to apply");
        return;
    }

    await pushRulesToService(rules);
});

