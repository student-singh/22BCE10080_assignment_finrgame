# 🎮 4 in a Row (Connect4) – Full Stack Real-Time Game

A real-time multiplayer Connect4 game built with React.js frontend and Node.js backend, featuring competitive bot gameplay, live leaderboards, Kafka-based analytics, and modern UI design.

✅ **All objectives and bonus requirements are implemented.**

## 🚀 Live Demo

🌐 **Frontend**: [https://22-bce-10080-assignment-finr.vercel.app/](https://22-bce-10080-assignment-finr.vercel.app/)  
🌐 **Backend API**: [https://two2bce10080-assignment-finr.onrender.com/](https://two2bce10080-assignment-finr.onrender.com/)

## 🧠 Objective

The goal of this assignment is to build a backend-driven real-time game server for 4 in a Row (Connect Four) with:

- **1v1 real-time multiplayer gameplay**
- **Competitive bot fallback**
- **Game state handling and persistence**
- **Leaderboard tracking**
- **Kafka-based analytics**
- **Simple frontend for interaction**

## 🕹 Game Rules – 4 in a Row

- The game is played on a **7×6 grid**
- Players take turns dropping discs into columns
- The disc falls to the lowest available slot
- The first player to connect **4 discs** wins:
  - **Horizontally**
  - **Vertically**
  - **Diagonally**
- If the board fills with no winner → **Draw**

## 🎯 Features Implemented (Assignment Mapping)

### 1️⃣ Player Matchmaking
- Players enter a username and join the game queue
- If no opponent joins within **10 seconds**, a competitive bot is assigned automatically

### 2️⃣ Competitive Bot (Non-Random)
The bot:
- Analyzes the board before each move
- Prioritizes:
  - **Blocking the player's immediate win**
  - **Creating its own winning opportunities**
- Plays valid, strategic moves
- ❌ **No random moves**

### 3️⃣ Real-Time Gameplay (WebSockets)
- Built using **Socket.IO**
- Instant move synchronization for both players
- Turn-based validation
- Real-time game state updates

### 🔄 Reconnection Handling
- If a player disconnects, they can rejoin the same game within **30 seconds**
- If they fail to reconnect:
  - The game is forfeited
  - Opponent (or bot) is declared the winner

### 4️⃣ Game State Management
- **In-memory state** for active games (fast gameplay)
- **PostgreSQL persistence** for completed games
- Game data stored:
  - Players
  - Winner
  - Draw state
  - Timestamp

### 5️⃣ 🏅 Leaderboard
- Tracks **number of games won** per player
- Displays **Top 5 players**
- Updated in real-time after game completion

### 🖥️ Frontend (Simple & Functional)
Built with **React.js**, focusing on gameplay rather than styling.

**Frontend Capabilities:**
- Username entry
- 7×6 grid game board
- Click-to-drop disc interaction
- Real-time opponent/bot moves
- Win / Loss / Draw display
- Live leaderboard

💡 **Styling kept minimal to prioritize backend-driven functionality.**

## 📁 Project Structure

```
4inRowGame/
├── backend/                   # Node.js Backend
│   ├── controllers/           # Game logic controllers
│   ├── services/             # Game services
│   ├── routes/               # API routes
│   ├── db/                   # Database configuration
│   ├── kafka/                # Kafka producer/consumer
│   ├── bot/                  # Bot logic
│   ├── analytics/            # Analytics consumer
│   └── utils/                # Utility functions
├── frontend/                  # React.js Frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Landing.jsx   # Home page
│   │   │   ├── Lobby.jsx     # Name entry & game rules
│   │   │   ├── GameBoard.jsx # Main game interface
│   │   │   └── Leaderboard.jsx # Top players table
│   │   ├── socket.js         # Socket.IO client
│   │   └── App.jsx           # Main app component
│   └── public/               # Static assets
└── README.md                 # This file
```

## 🛠️ Tech Stack

### Frontend
- **React.js** - UI Framework
- **React Router** - Navigation
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP requests
- **CSS-in-JS** - Inline styling

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **PostgreSQL** - Database
- **Kafka** - Event streaming
- **UUID** - Unique game IDs

## 📋 Prerequisites

Before running this application locally, make sure you have:

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **PostgreSQL** database
- **Kafka** (optional for analytics)

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/student-singh/22BCE10080_assignment_finrgame.git
cd 4inRowGame
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=connect4
# DB_USER=your_username
# DB_PASSWORD=your_password
# PORT=5000

# Set up PostgreSQL database
createdb connect4

# Create required tables
psql -d connect4 -c "
CREATE TABLE games (
    id VARCHAR(255) PRIMARY KEY,
    player1 VARCHAR(255) NOT NULL,
    player2 VARCHAR(255) NOT NULL,
    winner VARCHAR(255),
    is_draw BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Start the backend server
npm start
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Update socket connection in src/socket.js if needed
# const socket = io("https://two2bce10080-assignment-finr.onrender.com");

# Start the frontend development server
npm start
```

The frontend will run on `http://localhost:3000`

## 🎯 How to Play

1. **Enter Your Name**: Start by entering your name in the lobby
2. **Game Rules**: Learn the objective - get 4 pieces in a row (horizontal, vertical, or diagonal)
3. **Find Opponent**: Wait for another player or play against the bot after 10 seconds
4. **Make Moves**: Click on any column to drop your piece
5. **Win Condition**: First to get 4 in a row wins!
6. **Leaderboard**: Check your ranking among the top 5 players

## 🎮 Game Features

### Real-time Gameplay
- Instant move updates via WebSockets
- Turn-based gameplay with visual indicators
- Automatic opponent matching

### Bot Intelligence
- Smart bot that analyzes board state
- **Non-random strategic moves**
- Blocks player wins and creates winning opportunities
- Fallback opponent when no human players available
- Challenging gameplay experience

### Modern UI/UX
- Dark theme with green accents
- Responsive design for all screen sizes
- Smooth animations and hover effects
- Clean table-based leaderboard

## 🚀 Deployment

### Backend Deployment (Render)

**Live Backend**: [https://two2bce10080-assignment-finr.onrender.com/](https://two2bce10080-assignment-finr.onrender.com/)

1. **Environment Variables**:
   ```
   DATABASE_URL=your_postgres_url
   PORT=5000
   ```

2. **Build Command**: `npm install`
3. **Start Command**: `npm start`

### Frontend Deployment (Vercel)

**Live Frontend**: [https://22-bce-10080-assignment-finr.vercel.app/](https://22-bce-10080-assignment-finr.vercel.app/)

1. **Root Directory**: `frontend`
2. **Build Command**: `npm run build`
3. **Output Directory**: `build`
4. **Environment Variables**: Update socket URL in `src/socket.js` to point to deployed backend

## 💥 Kafka-Based Game Analytics

Simulate a real-world production use case by implementing **decoupled game analytics** using **Kafka**.

> **Note**: Kafka integration is currently configured for local development only and is not deployed to production.

### Features

The Kafka analytics system provides comprehensive game monitoring through:

### Kafka Producer (Game Service)
- Publishes game events to Kafka topics in real-time
- Tracks key gameplay events:
  - Game start/end events
  - Player moves and game state changes
  - Win/draw/disconnect events
  - User session data

### Kafka Consumer (Analytics Service)

Build a simple Kafka consumer that:

- **Event Logging**: Logs all game events or stores them in a database
- **Gameplay Metrics Tracking**:
  - Average game duration
  - Most frequent winners
  - Games per day/hour
  - Peak playing hours
- **User-Specific Metrics**:
  - Individual player statistics
  - Win/loss ratios
  - Playing patterns and preferences
  - Session duration tracking

### Local Setup for Kafka Analytics

To run the analytics system locally:

```bash
# 1. Start Kafka (requires Apache Kafka installed)
# Start Zookeeper
bin/zookeeper-server-start.sh config/zookeeper.properties

# Start Kafka Server
bin/kafka-server-start.sh config/server.properties

# 2. Run the analytics consumer
cd backend/analytics
npm install
npm start

# 3. Start the main backend (with Kafka producer)
cd ../
npm start
```

### Analytics Dashboard (Local)

The analytics consumer provides insights into:
- Real-time game statistics
- Player behavior patterns
- System performance metrics
- Historical game data analysis

This decoupled architecture demonstrates modern microservices patterns and event-driven design, making the system scalable and maintainable for production environments.

## 📊 Database Schema

### Games Table
```sql
CREATE TABLE games (
    id VARCHAR(255) PRIMARY KEY,
    player1 VARCHAR(255) NOT NULL,
    player2 VARCHAR(255) NOT NULL,
    winner VARCHAR(255),
    is_draw BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 API Endpoints

### REST API
- `GET /leaderboard` - Get top 5 players

### Socket Events
- `joinGame` - Join game queue
- `makeMove` - Make a move
- `gameStarted` - Game initialization
- `moveMade` - Move broadcast
- `gameOver` - Game completion
- `playerDisconnected` - Player disconnect event
- `playerReconnected` - Player reconnect event

## 🐛 Troubleshooting

### Common Issues

1. **Connection Issues**:
   - Check if backend is running on port 5000
   - Verify database connection
   - Ensure frontend socket URL matches backend

2. **Database Errors**:
   - Verify PostgreSQL is running
   - Check database credentials in .env
   - Ensure tables are created

3. **Build Errors**:
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

## 👥 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request



- **GitHub**: https://github.com/AnshulMishra2003


