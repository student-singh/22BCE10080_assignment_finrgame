// routes/leaderboard.js

const express = require("express");
const router = express.Router();
const pool = require("../db");

// Simple in-memory cache
let leaderboardCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache

// GET /leaderboard — Return top 10 players sorted by win count
router.get("/", async (req, res) => {
  try {
    // Return cached result if available and not expired
    const now = Date.now();
    if (leaderboardCache && (now - lastCacheTime < CACHE_TTL)) {
      console.log("✅ Returning cached leaderboard");
      
      // Add cache headers
      res.set('Cache-Control', 'public, max-age=60'); // 60 seconds
      res.set('X-Cache', 'HIT');
      
      return res.json(leaderboardCache);
    }
    
    // Query database for fresh data
    console.log("🔄 Fetching fresh leaderboard data");
    const result = await pool.query(`
      SELECT winner, COUNT(*) AS wins
      FROM games
      WHERE winner IS NOT NULL
      GROUP BY winner
      ORDER BY wins DESC
      LIMIT 10
    `);
    
    // Update cache
    leaderboardCache = result.rows;
    lastCacheTime = now;
    
    // Set cache headers
    res.set('Cache-Control', 'public, max-age=60'); // 60 seconds
    res.set('X-Cache', 'MISS');
    
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Leaderboard fetch error:", err.message);
    res.status(500).json({ 
      error: "Leaderboard fetch failed",
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
