const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "connect4-analytics",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "analytics-group" });

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "game-events", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const type = message.key.toString();
      const data = JSON.parse(message.value.toString());

      console.log(`📊 [${type}] Event Received`);
      console.log(data);

      // 🧠 Here you can insert to DB or update memory-stats
      // For demo, just track number of games
      if (type === "gameOver") {
        // Example metric processing
        // storeGameInDB(data); or update in-memory stats
      }
    },
  });
};

run().catch(console.error);
