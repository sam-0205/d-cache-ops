const express = require("express");
const { createClient } = require("redis");
const amqp = require("amqplib");

const users = require("./data/users.json");

const app = express();
app.use(express.json());

const SERVICE_NAME = "user-service"; // 🔁 CHANGED
const PORT = 3002;                   // 🔁 CHANGED

/* ---------- Redis ---------- */
const redisClient = createClient({ url: "redis://localhost:6379" });
redisClient.connect();

/* ---------- RabbitMQ ---------- */
let channel;
async function connectRabbitMQ() {
    const conn = await amqp.connect("amqp://localhost");
    channel = await conn.createChannel();
    await channel.assertQueue("usage_metrics");
}
connectRabbitMQ();

/* ---------- Cache Rules ---------- */
const cacheRules = new Map();

/* ---------- Rule Update Endpoint ---------- */
app.post("/cache/update-rules", (req, res) => {
    const { service, endpoint, ttl } = req.body;

    if (service !== SERVICE_NAME) {
        return res.json({ message: "Rule ignored" });
    }

    cacheRules.set(endpoint, { ttl });
    console.log("Cache rule applied:", endpoint, ttl);

    res.json({ message: "Cache rule applied" });
});

/* ---------- Helper ---------- */
function emitUsageMetric(event) {
    if (!channel) return;
    channel.sendToQueue("usage_metrics", Buffer.from(JSON.stringify(event)));
}

/* ---------- USER API ---------- */
app.get("/users/:id", async (req, res) => {
    // console.log("🔥 /users/:id HIT on user-service");

    const userId = req.params.id;
    const cacheKey = `user:${userId}`;

    let responseUser;
    let cacheHit = false;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
        console.log("CACHE HIT");
        responseUser = JSON.parse(cached);
        cacheHit = true;
    } else {
        console.log("CACHE MISS");
        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        responseUser = user;

        const rule = cacheRules.get("/users/:id");
        if (rule) {
            await redisClient.setEx(cacheKey, rule.ttl, JSON.stringify(user));
            console.log("User cached:", cacheKey);
        }
    }

    res.json(responseUser);

    emitUsageMetric({
        service: SERVICE_NAME,
        endpoint: "/users/:id",
        timestamp: Date.now(),
        cache_hit: cacheHit
    });
});


/* ---------- Start ---------- */
app.listen(PORT, () => {
    console.log(`User service running on port ${PORT}`);
});
