import React from "react";
import { useNavigate } from "react-router-dom";
import Leaderboard from "./Leaderboard";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0b1d1f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "50px 20px",
        color: "#fff",
      }}
    >
      <div
        style={{
          backgroundColor: "#122c2f",
          borderRadius: "20px",
          padding: "40px",
          maxWidth: "800px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "36px", marginBottom: "30px" }}>Connect4</h1>
        <img
          src="/images/board-game.jpg"
          alt="Board game"
          style={{
            width: "40%",
            borderRadius: "10px",
            marginBottom: "30px",
            objectFit: "cover",
          }}
        />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
          <button
            onClick={() => navigate("/play")}
            style={{
              backgroundColor: "#6ee7b7",
              color: "#000",
              border: "none",
              borderRadius: "20px",
              padding: "12px 30px",
              fontSize: "18px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Play
          </button>
        </div>

        <h2 style={{ marginTop: "20px", marginBottom: "20px" }}>🏆 Leaderboard</h2>
        <Leaderboard />
      </div>
    </div>
  );
};

export default Landing;
