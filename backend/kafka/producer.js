// kafka/producer.js
const { Kafka } = require("kafkajs");

let producer = null;
let kafkaConnected = false;

const kafka = new Kafka({
  clientId: "connect4-backend",
  brokers: ["localhost:9092"], // or use env var
});

async function connectProducer() {
  try {
    producer = kafka.producer();
    await producer.connect();
    kafkaConnected = true;
    console.log("✅ Kafka producer connected");
  } catch (err) {
    kafkaConnected = false;
    console.warn("⚠️ Kafka not available. Analytics disabled.");
  }
}

async function sendGameEvent(type, data) {
  if (!kafkaConnected) return; // gracefully skip
  try {
    await producer.send({
      topic: "game-events",
      messages: [
        {
          key: type,
          value: JSON.stringify(data),
        },
      ],
    });
  } catch (err) {
    console.error("❌ Failed to send Kafka event:", err.message);
  }
}

module.exports = {
  connectProducer,
  sendGameEvent,
};
