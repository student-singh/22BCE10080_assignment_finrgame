// utils/checkWinner.js

module.exports = function checkWinner(board, symbol) {
  const ROWS = 6;
  const COLS = 7;

  const directions = [
    [0, 1],  // Horizontal
    [1, 0],  // Vertical
    [1, 1],  // Diagonal down-right
    [1, -1], // Diagonal down-left
  ];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== symbol) continue;

      for (let [dr, dc] of directions) {
        let count = 1;
        let nr = r + dr;
        let nc = c + dc;
        let winningPositions = [[r, c]]; // Start with the current position

        while (
          nr >= 0 &&
          nc >= 0 &&
          nr < ROWS &&
          nc < COLS &&
          board[nr][nc] === symbol
        ) {
          count++;
          winningPositions.push([nr, nc]);
          if (count === 4) {
            return { isWinner: true, winningPositions };
          }
          nr += dr;
          nc += dc;
        }
      }
    }
  }

  return { isWinner: false, winningPositions: [] };
};
