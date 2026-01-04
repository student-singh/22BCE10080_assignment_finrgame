// bot/botLogic.js

const checkWinner = require("../utils/checkWinner");

module.exports = function botLogic(board) {
  const BOT_SYMBOL = "O";
  const PLAYER_SYMBOL = "X";

  const ROWS = board.length;
  const COLS = board[0].length;

  const getValidColumns = () => {
    const valid = [];
    for (let c = 0; c < COLS; c++) {
      if (board[0][c] === null) valid.push(c);
    }
    return valid;
  };

  const simulateMove = (b, col, symbol) => {
    const temp = b.map(row => row.slice()); // Deep copy
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!temp[r][col]) {
        temp[r][col] = symbol;
        break;
      }
    }
    return temp;
  };

  const validColumns = getValidColumns();

  // 1. Try to win
  for (let col of validColumns) {
    const testBoard = simulateMove(board, col, BOT_SYMBOL);
    if (checkWinner(testBoard, BOT_SYMBOL)) {
      return col;
    }
  }

  // 2. Try to block opponent
  for (let col of validColumns) {
    const testBoard = simulateMove(board, col, PLAYER_SYMBOL);
    if (checkWinner(testBoard, PLAYER_SYMBOL)) {
      return col;
    }
  }

  // 3. Center preference (column 3)
  if (validColumns.includes(3)) return 3;

  // 4. Otherwise, prefer columns near center (3,2,4,1,5,0,6)
  const preferredOrder = [3, 2, 4, 1, 5, 0, 6];
  for (let col of preferredOrder) {
    if (validColumns.includes(col)) return col;
  }

  // 5. Fallback to any valid column
  return validColumns[0] || 0;
};
