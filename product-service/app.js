const express = require("express");
const { createClient } = require("redis");
const amqp = require("amqplib");




const app = express();
const PORT = 3001;

app.get("/health", (req, res) => {
  res.json({ status: "product-service up" });
});

app.listen(PORT, () => {
  console.log(`Product service running on port ${PORT}`);
});


const redisClient = createClient({
  url: "redis://localhost:6379"
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

(async () => {
  await redisClient.connect();
  console.log("Connected to Redis");
})();

const cacheRules = new Map();

app.post("/cache/update-rules", express.json(), (req, res) => {
  const { endpoint, ttl } = req.body;

  if (!endpoint || !ttl) {
    return res.status(400).json({ message: "Invalid rule format" });
  }

  cacheRules.set(endpoint, { ttl });

  console.log("Cache rule updated:", endpoint, ttl);
  res.json({ message: "Cache rule applied" });
});


let channel;

async function connectRabbitMQ() {
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();

  await channel.assertQueue("usage_metrics");
  console.log("Connected to RabbitMQ");
}

connectRabbitMQ();

function emitUsageMetric(event) {
  if (!channel) return;

  channel.sendToQueue(
    "usage_metrics",
    Buffer.from(JSON.stringify(event))
  );
}


const products = require("./data/products.json");
app.get("/products/:id", async (req, res) => {
  const productId = req.params.id;
  const cacheKey = `product:${productId}`;

  let responseProduct;
  let cacheHit = false;

  // 1️⃣ Check cache
  const cachedProduct = await redisClient.get(cacheKey);

  if (cachedProduct) {
    console.log("CACHE HIT");
    responseProduct = JSON.parse(cachedProduct);
    cacheHit = true;
  } else {
    console.log("CACHE MISS");

    // 2️⃣ Fallback to data source
    const product = products.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    responseProduct = product;

    // 3️⃣ Store in cache if rule exists
    const rule = cacheRules.get("/products/:id");
    if (rule) {
      await redisClient.setEx(cacheKey, rule.ttl, JSON.stringify(product));
    }
  }

  // 4️⃣ Send response
  res.json(responseProduct);

  // 5️⃣ Emit usage metric (AFTER response)
  emitUsageMetric({
    service: "product-service",
    endpoint: "/products/:id",
    timestamp: Date.now(),
    cache_hit: cacheHit
  });
});


