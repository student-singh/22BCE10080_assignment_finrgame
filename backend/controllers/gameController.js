// controllers/gameController.js

const GameService = require("../services/gameService");

module.exports = (io) => {
  const games = {}; // Active in-memory games
  const waitingPlayers = [];

  io.on("connection", (socket) => {
    console.log(`⚡ New client connected: ${socket.id}`);

    socket.on("joinGame", (username) => {
      console.log(`${username} attempting to join`);

      socket.username = username;

      // ✅ Prevent duplicate queue entries
      const alreadyInQueue = waitingPlayers.find(s => s.id === socket.id);
      if (alreadyInQueue) {
        console.log(`⚠️ ${username} is already in the queue.`);
        return;
      }

      waitingPlayers.push(socket);
      console.log(`${username} joined`);

      // ✅ Pair players if 2 are waiting
      if (waitingPlayers.length >= 2) {
        const [p1, p2] = waitingPlayers.splice(0, 2);
        GameService.startNewGame(p1, p2, io, games);
      } else {
        // 🧠 Fallback to bot after 10 seconds
        setTimeout(() => {
          if (waitingPlayers.includes(socket)) {
            const index = waitingPlayers.indexOf(socket);
            if (index !== -1) waitingPlayers.splice(index, 1);

            const Bot = require("../bot/botPlayer");
            const botSocket = Bot.createBotSocket(io);

            GameService.startNewGame(socket, botSocket, io, games, true);
          }
        }, 10000);
      }
    });

    socket.on("makeMove", ({ gameId, column }) => {
      GameService.handleMove(socket, gameId, column, games, io);
    });

    socket.on("disconnect", () => {
      console.log(`⚠️ ${socket.username} disconnected`);

      // 🧹 Remove from waiting pool if pending
      const index = waitingPlayers.findIndex(s => s.id === socket.id);
      if (index !== -1) waitingPlayers.splice(index, 1);

      // 🔁 If already in game, start disconnect timer
      for (let gameId in games) {
        const game = games[gameId];

        if (!game.symbols[socket.id]) continue;

        const opponent = game.players.find(p => p.id !== socket.id);
        if (!opponent) continue;

        io.to(gameId).emit("playerDisconnected", {
          message: `${socket.username} disconnected. Waiting 30s to reconnect...`,
        });

        // ⏳ Give 30 seconds to reconnect
        game.disconnectTimers[socket.username] = setTimeout(() => {
          io.to(gameId).emit("gameOver", {
            winner: opponent.username,
            reason: "disconnect timeout",
          });

          delete games[gameId];
        }, 30000);
      }
    });

    socket.on("rejoin", (username) => {
      console.log(`🔄 ${username} attempting to rejoin...`);

      for (let gameId in games) {
        const game = games[gameId];
        if (game.usernames[username]) {
          const oldSocketId = game.usernames[username];

          // ✅ Cancel disconnect timer
          clearTimeout(game.disconnectTimers[username]);

          // 🔁 Rebind socket
          game.symbols[socket.id] = game.symbols[oldSocketId];
          delete game.symbols[oldSocketId];

          game.usernames[username] = socket.id;
          socket.username = username;
          socket.join(gameId);

          game.players = game.players.map(p =>
            p.id === oldSocketId ? socket : p
          );

          // 🎯 Restore state
          socket.emit("rejoinSuccess", {
            gameId,
            board: game.board,
            turn: game.turn === socket.id,
            opponent: game.players.find(p => p.id !== socket.id).username,
          });

          io.to(gameId).emit("playerRejoined", {
            message: `${username} rejoined the game.`,
          });

          return;
        }
      }

      socket.emit("rejoinFailed", {
        message: "Game not found or timeout expired.",
      });
    });
  });
};
