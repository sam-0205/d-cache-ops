const amqp = require("amqplib");
const { Pool } = require("pg");

const pool = new Pool({
    host: "localhost",
    port: 5432,
    user: "usage_user",
    password: "usage_pass",
    database: "usage_db",
});


async function createTableIfNotExists() {
    const query = `
    CREATE TABLE IF NOT EXISTS usage_metrics (
      id SERIAL PRIMARY KEY,
      service VARCHAR NOT NULL,
      endpoint VARCHAR NOT NULL,
      cache_hit BOOLEAN NOT NULL,
      created_at TIMESTAMP NOT NULL
    );
  `;

    await pool.query(query);
    console.log("usage_metrics table ready");
}



async function startConsumer() {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();

    const queueName = "usage_metrics";
    await channel.assertQueue(queueName);

    await createTableIfNotExists();

    console.log("Usage Collector is listening for messages...");


    channel.consume(queueName, async (msg) => {
        if (!msg) return;

        const event = JSON.parse(msg.content.toString());
        await pool.query(
            `INSERT INTO usage_metrics (service, endpoint, cache_hit, created_at)
                    VALUES ($1, $2, $3, to_timestamp($4 / 1000.0))`,
            [
                event.service,
                event.endpoint,
                event.cache_hit,
                event.timestamp
            ]
        );

        console.log("Stored usage event:", event);


        channel.ack(msg);
    });
}

startConsumer();
