// services/gameService.js

const { v4: uuidv4 } = require("uuid");
const checkWinner = require("../utils/checkWinner");
const { sendGameEvent } = require("../kafka/producer");
const pool = require("../db");

const saveGameToDB = async (game, winner = null, isDraw = false) => {
  try {
    const [p1, p2] = game.players.map(p => p.username);
    await pool.query(
      `INSERT INTO games (id, player1, player2, winner, is_draw) VALUES ($1, $2, $3, $4, $5)`,
      [game.id, p1, p2, winner, isDraw]
    );
  } catch (err) {
    console.error("❌ Failed to save game:", err);
  }
};

const createEmptyBoard = () => {
  return Array.from({ length: 6 }, () => Array(7).fill(null));
};

const dropDisc = (board, column, symbol) => {
  for (let row = board.length - 1; row >= 0; row--) {
    if (!board[row][column]) {
      board[row][column] = symbol;
      return row;
    }
  }
  return -1; // Column full
};

const isBoardFull = (board) => {
  return board.every(row => row.every(cell => cell));
};

const GameService = {
  startNewGame: (p1, p2, io, games, isBotGame = false) => {
    const gameId = uuidv4();

    const game = {
      id: gameId,
      board: createEmptyBoard(),
      players: [p1, p2],
      symbols: {
        [p1.id]: "X",
        [p2.id]: "O",
      },
      usernames: {
        [p1.username]: p1.id,
        [p2.username]: p2.id,
      },
      turn: p1.id,
      isBotGame,
      disconnectTimers: {},
      createdAt: new Date(),
    };

    games[gameId] = game;

    p1.join(gameId);
    p2.join(gameId);

    io.to(gameId).emit("gameStarted", {
      gameId,
      board: game.board,
      players: [p1.username, p2.username],
      turn: p1.username,
    });

    io.to(p1.id).emit("opponentFound", { opponent: p2.username });
    io.to(p2.id).emit("opponentFound", { opponent: p1.username });

    console.log(`🆚 Match started: ${p1.username} vs ${p2.username}`);
  },

  handleMove: async (socket, gameId, column, games, io) => {
    const game = games[gameId];
    if (!game || game.turn !== socket.id) return;

    const symbol = game.symbols[socket.id];
    const row = dropDisc(game.board, column, symbol);
    if (row === -1) return;

    io.to(gameId).emit("moveMade", {
      column,
      row,
      symbol,
      board: game.board,
    });

    const winResult = checkWinner(game.board, symbol);
    if (winResult.isWinner) {
      io.to(gameId).emit("gameOver", {
        winner: socket.username,
        board: game.board,
        winningPositions: winResult.winningPositions, // Include winning positions
      });
      await sendGameEvent("gameOver", {
        winner: socket.username,
        players: game.players.map(p => p.username),
        duration: Date.now() - game.createdAt,
        timestamp: new Date(),
      });
      await saveGameToDB(game, socket.username);
      delete games[gameId];
      return;
    }

    if (isBoardFull(game.board)) {
      io.to(gameId).emit("gameOver", {
        winner: null,
        draw: true,
        board: game.board, // Include final board state
      });
      
      await sendGameEvent("gameOver", {
        winner: socket.username,
        players: game.players.map(p => p.username),
        duration: Date.now() - game.createdAt,
        timestamp: new Date(),
      });
      await saveGameToDB(game, null, true);
      delete games[gameId];
      return;
    }

    // Switch turn
  game.turn = game.players.find(p => p.id !== socket.id).id;
  const nextPlayerSocket = io.sockets.sockets.get(game.turn) || game.players.find(p => p.id === game.turn);

// ✅ Trigger bot if it's their turn
  if (game.isBotGame && nextPlayerSocket?.isBot) {
     const botMove = require("../bot/botLogic")(game.board);
    console.log("🤖 Bot making move at column:", botMove);

    setTimeout(() => {
      GameService.handleMove(nextPlayerSocket, gameId, botMove, games, io);
    }, 300);

  }
  },
};

module.exports = GameService;
