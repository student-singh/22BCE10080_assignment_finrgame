const { Pool } = require("pg");
require("dotenv").config();

const isSSL = process.env.PGSSLMODE === "require";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ✅ updated
  ssl: isSSL ? { rejectUnauthorized: false } : false,
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database.");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL Error:", err);
  process.exit(-1);
});

module.exports = pool;
