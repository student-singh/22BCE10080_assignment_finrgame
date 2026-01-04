// src/components/Leaderboard.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";

const Leaderboard = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get("https://connect4-backend-ka4c.onrender.com/leaderboard");
        setData(res.data);
      } catch (err) {
        console.error("Error fetching leaderboard:", err.message);
        setError("Unable to load leaderboard.");
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div
      style={{
        maxWidth: "100%",
        margin: "0 auto",
        backgroundColor: "transparent",
        padding: "20px",
        borderRadius: "12px",
        textAlign: "center",
      }}
    >
      {error ? (
        <p style={{ color: "#ff6b6b", fontSize: "16px" }}>{error}</p>
      ) : data.length === 0 ? (
        <p style={{ color: "#ccc", fontSize: "16px" }}>No data yet. Play to enter the leaderboard!</p>
      ) : (
        <table style={{ 
          width: "100%", 
          borderCollapse: "collapse",
          marginTop: "10px"
        }}>
          <thead>
            <tr>
              <th style={{
                padding: "12px",
                backgroundColor: "#0b1d1f",
                color: "#6ee7b7",
                fontWeight: "bold",
                borderRadius: "8px 0 0 8px",
                textAlign: "center",
                border: "2px solid #6ee7b7"
              }}>Rank</th>
              <th style={{
                padding: "12px",
                backgroundColor: "#0b1d1f",
                color: "#6ee7b7",
                fontWeight: "bold",
                textAlign: "center",
                border: "2px solid #6ee7b7"
              }}>Player</th>
              <th style={{
                padding: "12px",
                backgroundColor: "#0b1d1f",
                color: "#6ee7b7",
                fontWeight: "bold",
                borderRadius: "0 8px 8px 0",
                textAlign: "center",
                border: "2px solid #6ee7b7"
              }}>Wins</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 5).map((user, i) => (
              <tr key={i}>
                <td style={{
                  padding: "12px",
                  backgroundColor: i === 0 ? "#6ee7b7" : "#0b1d1f",
                  color: i === 0 ? "#000" : "#fff",
                  fontWeight: i === 0 ? "bold" : "normal",
                  textAlign: "center",
                  border: `1px solid ${i === 0 ? "#6ee7b7" : "#333"}`,
                  borderRadius: i === 0 ? "8px 0 0 8px" : "0"
                }}>
                  {i + 1}
                </td>
                <td style={{
                  padding: "12px",
                  backgroundColor: i === 0 ? "#6ee7b7" : "#0b1d1f",
                  color: i === 0 ? "#000" : "#fff",
                  fontWeight: i === 0 ? "bold" : "normal",
                  textAlign: "center",
                  border: `1px solid ${i === 0 ? "#6ee7b7" : "#333"}`
                }}>
                  {user.winner}
                </td>
                <td style={{
                  padding: "12px",
                  backgroundColor: i === 0 ? "#6ee7b7" : "#0b1d1f",
                  color: i === 0 ? "#000" : "#fff",
                  fontWeight: i === 0 ? "bold" : "normal",
                  textAlign: "center",
                  border: `1px solid ${i === 0 ? "#6ee7b7" : "#333"}`,
                  borderRadius: i === 0 ? "0 8px 8px 0" : "0"
                }}>
                  {user.wins}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Leaderboard;
