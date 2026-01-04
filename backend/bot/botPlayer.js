// bot/botPlayer.js

function createBotSocket(io) {
  const botId = "BOT_" + Math.random().toString(36).substring(2, 8);
  
  const botSocket = {
    id: botId,
    username: "BotMaster",
    isBot: true,

    join: (room) => {
      // Simulate joining room (optional no-op)
      if (!io.sockets.adapter.rooms.get(room)) {
        io.sockets.adapter.rooms.set(room, new Set());
      }
      io.sockets.adapter.rooms.get(room).add(botId);
    },

    emit: () => {
      // No operation needed, bot doesn't receive emits
    },
  };

  return botSocket;
}

module.exports = {
  createBotSocket,
};
