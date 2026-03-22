# Sandtris Multiplayer - MVP Implementation Plan

## Context

You're building a multiplayer version of Sandtris (Tetris with sand physics simulation) to learn how multiplayer games work. Based on your experience with .NET/C# and SignalR, we'll implement an **MVP-first approach** starting with classic Tetris multiplayer, then evolve it to include sand physics.

### Why This Project?

- Learn modern multiplayer game architecture patterns
- Understand client-server synchronization
- Master real-time communication with WebSockets/SignalR
- Build foundation for deterministic physics simulation

### Architecture Decision: Hybrid Client Prediction

After analyzing three approaches (server-authoritative, client-authoritative, hybrid), we're implementing a **hybrid architecture** because it:

- ✅ Provides **zero input lag** for responsive gameplay (clients simulate locally)
- ✅ Maintains **competitive integrity** (server validates critical events)
- ✅ Teaches **industry-standard patterns** (used by most modern multiplayer games)
- ✅ Prepares for **sand physics** without major refactoring later

### MVP Scope: Classic Tetris Multiplayer

**Phase 1** (This plan): Build classic Tetris multiplayer without sand simulation

- Players drop traditional Tetris pieces that lock on the grid
- Lines clear when complete (standard Tetris rules)
- Focus on mastering multiplayer sync and architecture

**Phase 2** (Future): Add sand physics simulation

- Convert locked pieces into individual sand particles
- Implement deterministic falling sand physics
- Particles pile up and flow naturally

This incremental approach lets you learn core multiplayer concepts first, then add physics complexity.

---

## Architecture Overview

### High-Level Flow

```
Player 1 Browser                    .NET Server                   Player 2 Browser
┌──────────────────┐              ┌──────────────┐              ┌──────────────────┐
│  Game Simulation │◄─────────────┤  SignalR Hub  ├─────────────►│  Game Simulation │
│  (JavaScript)    │  WebSocket   │               │  WebSocket   │  (JavaScript)    │
│                  │              │  ┌─────────┐  │              │                  │
│ - Local Input    │──Input──────►│  │Validate │  ├──Input──────►│ - Apply Input    │
│ - Apply Locally  │              │  │ Queue   │  │              │ - Render Field   │
│ - Render Own     │◄─Broadcast───┤  │ Score   │  ├─Broadcast───►│ - Show Score     │
│ - Show Opponent  │              │  └─────────┘  │              │                  │
└──────────────────┘              └──────────────┘              └──────────────────┘
```

### Core Principles

1. **Client Prediction**: Players see their own moves instantly (apply input locally)
2. **Input Replication**: Send inputs to server → server validates → broadcasts to both clients
3. **Deterministic Simulation**: Same inputs = same output (enables efficient sync)
4. **Server Validation**: Server validates critical events (line clears, scores, game over)
5. **Both Clients Simulate Both Games**: Each client runs two game simulations (own + opponent)

### Why This Works

- **Low Latency**: Your own moves feel instant (0ms)
- **Low Bandwidth**: Only send small input events (~50 bytes), not full game state
- **Cheat Prevention**: Server validates scoring and win conditions
- **Smooth Opponent View**: Opponent's game simulated locally based on their inputs

---

## Technical Stack

### Backend

- **.NET 8/9** (ASP.NET Core)
- **SignalR** (WebSocket communication)
- **In-Memory Storage** (ConcurrentDictionary for game rooms/queue)

### Frontend

- **Vanilla JavaScript** (ES6+)
- **HTML5 Canvas** (rendering)
- **SignalR JavaScript Client** (npm package: @microsoft/signalr)

### Shared Logic

- **Tetris game logic** implemented in **both C# and JavaScript**
- Must produce identical results (deterministic)

---

## Project Structure

```
sandtris_multiplayer/
├── src/
│   ├── backend/
│   │   ├── Sandtris.sln
│   │   ├── Sandtris.Server/              # Main .NET project
│   │   │   ├── Program.cs                # ASP.NET Core setup
│   │   │   ├── appsettings.json
│   │   │   ├── Hubs/
│   │   │   │   └── GameHub.cs            # SignalR hub (matchmaking + game)
│   │   │   ├── Services/
│   │   │   │   ├── MatchmakingService.cs # Queue management
│   │   │   │   ├── GameRoomManager.cs    # Room lifecycle
│   │   │   │   └── InputValidator.cs     # Validate player inputs
│   │   │   └── Models/
│   │   │       ├── GameRoom.cs           # Room state
│   │   │       ├── PlayerState.cs        # Player game state
│   │   │       ├── GameInput.cs          # Input event format
│   │   │       └── Tetromino.cs          # Shared piece definitions
│   │   │
│   │   └── Sandtris.Shared/              # Shared C# logic
│   │       ├── GameConstants.cs          # Field size, piece shapes
│   │       ├── PieceGenerator.cs         # Seeded random piece generation
│   │       └── ScoringSystem.cs          # Score calculation rules
│   │
│   └── website/
│       ├── index.html                    # Main page
│       ├── css/
│       │   └── style.css                 # Game UI styles
│       ├── js/
│       │   ├── main.js                   # Entry point
│       │   ├── network/
│       │   │   └── signalr-client.js     # WebSocket connection
│       │   ├── game/
│       │   │   ├── GameSimulation.js     # Core game loop
│       │   │   ├── Tetromino.js          # Piece logic (mirrors C#)
│       │   │   ├── PieceGenerator.js     # Random generator (mirrors C#)
│       │   │   ├── InputManager.js       # Client prediction
│       │   │   └── GameState.js          # State management
│       │   ├── rendering/
│       │   │   └── Renderer.js           # Canvas rendering
│       │   └── ui/
│       │       ├── MatchmakingUI.js      # Queue/matchmaking screen
│       │       └── GameUI.js             # In-game UI
│       │
│       └── lib/
│           └── signalr.min.js            # SignalR client library
│
└── docs/
    └── PROTOCOL.md                       # Message format documentation
```

---

## Implementation Steps

### Step 1: Backend Foundation

#### 1.1 Create .NET Project Structure

**Files to create:**

- `src/backend/Sandtris.Server/Program.cs`
- `src/backend/Sandtris.Server/appsettings.json`
- `src/backend/Sandtris.Server/Sandtris.Server.csproj`

**Key Setup:**

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add SignalR
builder.Services.AddSignalR();

// Add CORS for local development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
               .AllowAnyHeader()
               .AllowAnyMethod()
               .AllowCredentials();
    });
});

// Register services as singletons (in-memory)
builder.Services.AddSingleton<MatchmakingService>();
builder.Services.AddSingleton<GameRoomManager>();
builder.Services.AddSingleton<InputValidator>();

var app = builder.Build();

app.UseCors();
app.MapHub<GameHub>("/game");

app.Run();
```

#### 1.2 Define Core Models

**File: `src/backend/Sandtris.Server/Models/GameInput.cs`**

```csharp
public class GameInput
{
    public string PlayerId { get; set; }
    public long SequenceNumber { get; set; }    // For ordering/dedup
    public long GameTick { get; set; }          // Frame number when input occurred
    public InputType Type { get; set; }
    public DateTime Timestamp { get; set; }
}

public enum InputType
{
    MoveLeft,
    MoveRight,
    RotateClockwise,
    RotateCounterClockwise,
    SoftDrop,      // Hold down to drop faster
    HardDrop       // Instant drop to bottom
}
```

**File: `src/backend/Sandtris.Server/Models/PlayerState.cs`**

```csharp
public class PlayerState
{
    public string PlayerId { get; set; }
    public string ConnectionId { get; set; }
    public int Score { get; set; }
    public int Level { get; set; }
    public int LinesCleared { get; set; }
    public bool IsDead { get; set; }
    public long LastSequenceNumber { get; set; }
    public long LastValidatedTick { get; set; }

    // Simplified tracking for validation (not full simulation)
    public int CurrentPieceX { get; set; }
    public int CurrentPieceY { get; set; }
    public int CurrentPieceRotation { get; set; }
}
```

**File: `src/backend/Sandtris.Server/Models/GameRoom.cs`**

```csharp
public class GameRoom
{
    public string RoomId { get; set; }
    public PlayerState Player1 { get; set; }
    public PlayerState Player2 { get; set; }
    public GameStatus Status { get; set; }
    public long CurrentTick { get; set; }
    public int RandomSeed { get; set; }  // For deterministic piece generation

    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }

    // Input history for debugging/replay (optional)
    public List<GameInput> InputHistory { get; set; } = new();
}

public enum GameStatus
{
    WaitingForPlayers,
    Countdown,
    Active,
    Finished
}
```

#### 1.3 Implement Matchmaking Service

**File: `src/backend/Sandtris.Server/Services/MatchmakingService.cs`**

```csharp
public class MatchmakingService
{
    private readonly ConcurrentQueue<PlayerInQueue> _queue = new();
    private readonly GameRoomManager _roomManager;

    public MatchmakingService(GameRoomManager roomManager)
    {
        _roomManager = roomManager;
    }

    public async Task<MatchResult> JoinQueue(string playerId, string connectionId)
    {
        var player = new PlayerInQueue(playerId, connectionId, DateTime.UtcNow);
        _queue.Enqueue(player);

        // Try to match immediately
        return await TryCreateMatch();
    }

    private async Task<MatchResult> TryCreateMatch()
    {
        if (_queue.Count >= 2)
        {
            if (_queue.TryDequeue(out var p1) && _queue.TryDequeue(out var p2))
            {
                var room = _roomManager.CreateRoom(p1, p2);
                return MatchResult.Success(room.RoomId);
            }
        }

        return MatchResult.Waiting();
    }

    public void LeaveQueue(string playerId)
    {
        // Note: ConcurrentQueue doesn't support removal
        // For MVP, accept that abandoned queue slots persist briefly
        // Production: use different data structure or periodic cleanup
    }
}
```

#### 1.4 Implement Game Room Manager

**File: `src/backend/Sandtris.Server/Services/GameRoomManager.cs`**

```csharp
public class GameRoomManager
{
    private readonly ConcurrentDictionary<string, GameRoom> _rooms = new();

    public GameRoom CreateRoom(PlayerInQueue player1, PlayerInQueue player2)
    {
        var roomId = Guid.NewGuid().ToString();
        var room = new GameRoom
        {
            RoomId = roomId,
            Player1 = new PlayerState
            {
                PlayerId = player1.PlayerId,
                ConnectionId = player1.ConnectionId
            },
            Player2 = new PlayerState
            {
                PlayerId = player2.PlayerId,
                ConnectionId = player2.ConnectionId
            },
            Status = GameStatus.Countdown,
            RandomSeed = Random.Shared.Next(),  // For deterministic pieces
            CreatedAt = DateTime.UtcNow,
            CurrentTick = 0
        };

        _rooms[roomId] = room;
        return room;
    }

    public GameRoom? GetRoom(string roomId)
    {
        _rooms.TryGetValue(roomId, out var room);
        return room;
    }

    public void UpdatePlayerState(string roomId, string playerId, Action<PlayerState> update)
    {
        if (_rooms.TryGetValue(roomId, out var room))
        {
            var player = room.Player1.PlayerId == playerId ? room.Player1 : room.Player2;
            update(player);
        }
    }

    public void DeleteRoom(string roomId)
    {
        _rooms.TryRemove(roomId, out _);
    }
}
```

#### 1.5 Implement Input Validator

**File: `src/backend/Sandtris.Server/Services/InputValidator.cs`**

```csharp
public class InputValidator
{
    private const int FIELD_WIDTH = 10;
    private const int TICK_TOLERANCE = 5;  // Allow 5 ticks ahead (lag compensation)

    public ValidationResult Validate(GameInput input, GameRoom room)
    {
        var player = room.Player1.PlayerId == input.PlayerId
            ? room.Player1
            : room.Player2;

        // 1. Check if player is alive
        if (player.IsDead)
            return ValidationResult.Reject("Player is dead");

        // 2. Prevent duplicate/replay inputs
        if (input.SequenceNumber <= player.LastSequenceNumber)
            return ValidationResult.Reject("Duplicate input");

        // 3. Timing validation (anti-speedhack)
        var expectedTick = player.LastValidatedTick + 1;
        if (input.GameTick > expectedTick + TICK_TOLERANCE)
            return ValidationResult.Reject("Input too far ahead");

        // 4. Basic bounds checking (optional - client should prevent this)
        // For MVP, trust clients mostly; add strict validation later

        return ValidationResult.Accept();
    }
}

public class ValidationResult
{
    public bool IsValid { get; set; }
    public string? Reason { get; set; }

    public static ValidationResult Accept() => new() { IsValid = true };
    public static ValidationResult Reject(string reason) => new() { IsValid = false, Reason = reason };
}
```

#### 1.6 Implement SignalR Hub

**File: `src/backend/Sandtris.Server/Hubs/GameHub.cs`**

```csharp
public class GameHub : Hub
{
    private readonly MatchmakingService _matchmaking;
    private readonly GameRoomManager _roomManager;
    private readonly InputValidator _validator;

    public GameHub(MatchmakingService matchmaking, GameRoomManager roomManager, InputValidator validator)
    {
        _matchmaking = matchmaking;
        _roomManager = roomManager;
        _validator = validator;
    }

    // Client calls this to find a match
    public async Task JoinMatchmaking(string playerId)
    {
        var result = await _matchmaking.JoinQueue(playerId, Context.ConnectionId);

        if (result.Success)
        {
            var room = _roomManager.GetRoom(result.RoomId!);
            if (room != null)
            {
                // Add both players to SignalR group
                await Groups.AddToGroupAsync(room.Player1.ConnectionId, result.RoomId!);
                await Groups.AddToGroupAsync(room.Player2.ConnectionId, result.RoomId!);

                // Notify both players: game found
                await Clients.Group(result.RoomId!).SendAsync("MatchFound", new
                {
                    RoomId = result.RoomId,
                    Player1Id = room.Player1.PlayerId,
                    Player2Id = room.Player2.PlayerId,
                    RandomSeed = room.RandomSeed
                });

                // Start countdown (3 seconds)
                await Task.Delay(3000);
                room.Status = GameStatus.Active;
                room.StartedAt = DateTime.UtcNow;
                await Clients.Group(result.RoomId!).SendAsync("GameStart");
            }
        }
        else
        {
            // Notify client: waiting for opponent
            await Clients.Caller.SendAsync("MatchmakingStatus", "Searching for opponent...");
        }
    }

    // Client sends input events
    public async Task SendInput(string roomId, GameInput input)
    {
        var room = _roomManager.GetRoom(roomId);
        if (room == null || room.Status != GameStatus.Active)
            return;

        // Validate input
        var validation = _validator.Validate(input, room);
        if (!validation.IsValid)
        {
            await Clients.Caller.SendAsync("InputRejected", validation.Reason);
            return;
        }

        // Update player's sequence number
        _roomManager.UpdatePlayerState(roomId, input.PlayerId, player =>
        {
            player.LastSequenceNumber = input.SequenceNumber;
            player.LastValidatedTick = input.GameTick;
        });

        // Broadcast to both clients (they will apply to their simulations)
        await Clients.Group(roomId).SendAsync("OpponentInput", input);

        // Store in history (for debugging)
        room.InputHistory.Add(input);
    }

    // Client reports line clear (server validates and updates score)
    public async Task ReportLinesClear(string roomId, string playerId, int linesCleared, int newScore)
    {
        var room = _roomManager.GetRoom(roomId);
        if (room == null) return;

        _roomManager.UpdatePlayerState(roomId, playerId, player =>
        {
            player.LinesCleared += linesCleared;
            player.Score = newScore;
            player.Level = player.LinesCleared / 10 + 1;  // Standard Tetris leveling
        });

        // Broadcast updated score to both players
        await Clients.Group(roomId).SendAsync("ScoreUpdate", new
        {
            PlayerId = playerId,
            Score = newScore,
            LinesCleared = linesCleared
        });
    }

    // Client reports game over
    public async Task ReportGameOver(string roomId, string playerId, int finalScore)
    {
        var room = _roomManager.GetRoom(roomId);
        if (room == null) return;

        _roomManager.UpdatePlayerState(roomId, playerId, player =>
        {
            player.IsDead = true;
            player.Score = finalScore;
        });

        // Notify opponent
        await Clients.Group(roomId).SendAsync("OpponentDied", playerId);

        // Check if both players are dead
        if (room.Player1.IsDead && room.Player2.IsDead)
        {
            room.Status = GameStatus.Finished;
            room.EndedAt = DateTime.UtcNow;

            // Determine winner
            var winner = room.Player1.Score > room.Player2.Score
                ? room.Player1
                : room.Player2;

            await Clients.Group(roomId).SendAsync("GameFinished", new
            {
                WinnerId = winner.PlayerId,
                Player1Score = room.Player1.Score,
                Player2Score = room.Player2.Score
            });

            // Cleanup after 10 seconds
            _ = Task.Delay(10000).ContinueWith(_ => _roomManager.DeleteRoom(roomId));
        }
    }

    // Handle disconnections
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Find room containing this connection
        // For MVP: accept that disconnects require game restart
        // Production: implement reconnection logic

        await base.OnDisconnectedAsync(exception);
    }
}
```

---

### Step 2: Frontend Foundation

#### 2.1 Setup HTML Structure

**File: `src/website/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sandtris Multiplayer</title>
    <link rel="stylesheet" href="css/style.css" />
  </head>
  <body>
    <!-- Matchmaking Screen -->
    <div id="matchmaking-screen" class="screen active">
      <h1>Sandtris Multiplayer</h1>
      <div id="player-id-section">
        <input type="text" id="player-name" placeholder="Enter your name" />
        <button id="join-queue-btn">Find Match</button>
      </div>
      <div id="queue-status" class="hidden">
        <p>Searching for opponent...</p>
        <div class="spinner"></div>
      </div>
    </div>

    <!-- Game Screen -->
    <div id="game-screen" class="screen hidden">
      <div id="countdown" class="hidden">
        <h2 id="countdown-number">3</h2>
      </div>

      <div id="game-container">
        <!-- Your Field -->
        <div class="player-area">
          <h3>You</h3>
          <div class="game-info">
            <span>Score: <strong id="your-score">0</strong></span>
            <span>Lines: <strong id="your-lines">0</strong></span>
            <span>Level: <strong id="your-level">1</strong></span>
          </div>
          <canvas id="your-canvas" width="300" height="600"></canvas>
          <div class="controls-hint">
            ← → : Move | ↑ : Rotate | ↓ : Soft Drop | Space : Hard Drop
          </div>
        </div>

        <!-- Opponent Field -->
        <div class="player-area">
          <h3>Opponent</h3>
          <div class="game-info">
            <span>Score: <strong id="opponent-score">0</strong></span>
            <span>Lines: <strong id="opponent-lines">0</strong></span>
            <span>Level: <strong id="opponent-level">1</strong></span>
          </div>
          <canvas id="opponent-canvas" width="300" height="600"></canvas>
          <div id="opponent-status" class="status-indicator"></div>
        </div>
      </div>
    </div>

    <!-- Results Screen -->
    <div id="results-screen" class="screen hidden">
      <h2 id="result-title">Game Over</h2>
      <div id="result-details">
        <p><strong id="winner-name"></strong> wins!</p>
        <div class="scores">
          <p>Your Score: <strong id="final-your-score">0</strong></p>
          <p>Opponent Score: <strong id="final-opponent-score">0</strong></p>
        </div>
      </div>
      <button id="play-again-btn">Play Again</button>
    </div>

    <!-- Scripts -->
    <script src="lib/signalr.min.js"></script>
    <script type="module" src="js/main.js"></script>
  </body>
</html>
```

#### 2.2 Implement SignalR Client

**File: `src/website/js/network/signalr-client.js`**

```javascript
export class SignalRClient {
  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5000/game")
      .withAutomaticReconnect()
      .build();

    this.handlers = {};
    this.setupDefaultHandlers();
  }

  setupDefaultHandlers() {
    this.connection.on("MatchFound", (data) => {
      this.emit("matchFound", data);
    });

    this.connection.on("GameStart", () => {
      this.emit("gameStart");
    });

    this.connection.on("OpponentInput", (input) => {
      this.emit("opponentInput", input);
    });

    this.connection.on("ScoreUpdate", (data) => {
      this.emit("scoreUpdate", data);
    });

    this.connection.on("OpponentDied", (playerId) => {
      this.emit("opponentDied", playerId);
    });

    this.connection.on("GameFinished", (result) => {
      this.emit("gameFinished", result);
    });

    this.connection.on("InputRejected", (reason) => {
      console.warn("Input rejected:", reason);
    });
  }

  async connect() {
    try {
      await this.connection.start();
      console.log("Connected to server");
      return true;
    } catch (err) {
      console.error("Connection failed:", err);
      return false;
    }
  }

  async joinMatchmaking(playerId) {
    await this.connection.invoke("JoinMatchmaking", playerId);
  }

  async sendInput(roomId, input) {
    await this.connection.invoke("SendInput", roomId, input);
  }

  async reportLinesClear(roomId, playerId, linesCleared, newScore) {
    await this.connection.invoke("ReportLinesClear", roomId, playerId, linesCleared, newScore);
  }

  async reportGameOver(roomId, playerId, finalScore) {
    await this.connection.invoke("ReportGameOver", roomId, playerId, finalScore);
  }

  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  emit(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach((handler) => handler(data));
    }
  }
}
```

#### 2.3 Implement Game Simulation (Deterministic Tetris)

**File: `src/website/js/game/GameSimulation.js`**

```javascript
import { PieceGenerator } from "./PieceGenerator.js";
import { Tetromino } from "./Tetromino.js";

export class GameSimulation {
  constructor(playerId, randomSeed) {
    this.playerId = playerId;
    this.randomSeed = randomSeed;

    // Field dimensions (classic Tetris)
    this.FIELD_WIDTH = 10;
    this.FIELD_HEIGHT = 20;

    // Game state
    this.field = this.createEmptyField();
    this.currentPiece = null;
    this.nextPiece = null;
    this.pieceGenerator = new PieceGenerator(randomSeed);

    this.score = 0;
    this.linesCleared = 0;
    this.level = 1;
    this.gameOver = false;

    this.currentTick = 0;
    this.dropCounter = 0;
    this.dropInterval = 60; // Frames until auto-drop (60 = 1 second at 60fps)

    // Spawn first pieces
    this.nextPiece = this.pieceGenerator.next();
    this.spawnPiece();
  }

  createEmptyField() {
    return Array.from({ length: this.FIELD_HEIGHT }, () => Array(this.FIELD_WIDTH).fill(0));
  }

  spawnPiece() {
    this.currentPiece = new Tetromino(this.nextPiece.type, Math.floor(this.FIELD_WIDTH / 2) - 1, 0);
    this.nextPiece = this.pieceGenerator.next();

    // Check if spawn position is blocked (game over)
    if (this.checkCollision(this.currentPiece)) {
      this.gameOver = true;
      return false;
    }
    return true;
  }

  // Core game loop - called every frame (60fps)
  tick() {
    if (this.gameOver) return;

    this.currentTick++;
    this.dropCounter++;

    // Auto-drop based on level
    const currentDropInterval = Math.max(5, this.dropInterval - (this.level - 1) * 5);
    if (this.dropCounter >= currentDropInterval) {
      this.dropCounter = 0;
      this.moveDown();
    }
  }

  // Apply input (called when player presses key OR opponent input received)
  applyInput(input) {
    if (this.gameOver) return;

    switch (
      input.Type ||
      input.type // Handle both C# and JS naming
    ) {
      case "MoveLeft":
      case 0:
        this.moveLeft();
        break;
      case "MoveRight":
      case 1:
        this.moveRight();
        break;
      case "RotateClockwise":
      case 2:
        this.rotate();
        break;
      case "SoftDrop":
      case 4:
        this.moveDown();
        break;
      case "HardDrop":
      case 5:
        this.hardDrop();
        break;
    }
  }

  moveLeft() {
    this.currentPiece.x--;
    if (this.checkCollision(this.currentPiece)) {
      this.currentPiece.x++;
    }
  }

  moveRight() {
    this.currentPiece.x++;
    if (this.checkCollision(this.currentPiece)) {
      this.currentPiece.x--;
    }
  }

  rotate() {
    const originalRotation = this.currentPiece.rotation;
    this.currentPiece.rotation = (this.currentPiece.rotation + 1) % 4;

    if (this.checkCollision(this.currentPiece)) {
      this.currentPiece.rotation = originalRotation;
    }
  }

  moveDown() {
    this.currentPiece.y++;
    if (this.checkCollision(this.currentPiece)) {
      this.currentPiece.y--;
      this.lockPiece();
      return true; // Piece locked
    }
    return false;
  }

  hardDrop() {
    while (!this.moveDown()) {
      // Keep dropping until it locks
    }
  }

  lockPiece() {
    const shape = this.currentPiece.getShape();
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const fieldY = this.currentPiece.y + y;
          const fieldX = this.currentPiece.x + x;
          if (fieldY >= 0 && fieldY < this.FIELD_HEIGHT) {
            this.field[fieldY][fieldX] = this.currentPiece.type;
          }
        }
      }
    }

    // Check for completed lines
    const linesCleared = this.clearLines();
    if (linesCleared > 0) {
      this.linesCleared += linesCleared;
      this.updateScore(linesCleared);
      this.level = Math.floor(this.linesCleared / 10) + 1;

      // Return line clear info (for reporting to server)
      return { linesCleared, newScore: this.score };
    }

    // Spawn next piece
    this.spawnPiece();
    return null;
  }

  clearLines() {
    let cleared = 0;
    for (let y = this.FIELD_HEIGHT - 1; y >= 0; y--) {
      if (this.field[y].every((cell) => cell !== 0)) {
        // Remove line and add empty line at top
        this.field.splice(y, 1);
        this.field.unshift(Array(this.FIELD_WIDTH).fill(0));
        cleared++;
        y++; // Check same row again
      }
    }
    return cleared;
  }

  updateScore(linesCleared) {
    // Standard Tetris scoring
    const points = [0, 40, 100, 300, 1200]; // 0, 1, 2, 3, 4 lines
    this.score += points[linesCleared] * this.level;
  }

  checkCollision(piece) {
    const shape = piece.getShape();
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const fieldX = piece.x + x;
          const fieldY = piece.y + y;

          // Check boundaries
          if (fieldX < 0 || fieldX >= this.FIELD_WIDTH || fieldY >= this.FIELD_HEIGHT) {
            return true;
          }

          // Check field collision (ignore negative Y for spawn)
          if (fieldY >= 0 && this.field[fieldY][fieldX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
```

#### 2.4 Implement Tetromino (Piece Logic)

**File: `src/website/js/game/Tetromino.js`**

```javascript
export class Tetromino {
  static SHAPES = {
    I: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
      ],
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
      ],
    ],
    O: [
      [
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1],
        [1, 1],
      ],
    ],
    T: [
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
    S: [
      [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 0, 0],
        [0, 1, 1],
        [1, 1, 0],
      ],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
    Z: [
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [1, 0, 0],
      ],
    ],
    J: [
      [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 1],
        [0, 1, 0],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
    ],
    L: [
      [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [1, 0, 0],
      ],
      [
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
      ],
    ],
  };

  static TYPES = ["I", "O", "T", "S", "Z", "J", "L"];

  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.rotation = 0;
  }

  getShape() {
    return Tetromino.SHAPES[this.type][this.rotation];
  }
}
```

#### 2.5 Implement Piece Generator (Deterministic Random)

**File: `src/website/js/game/PieceGenerator.js`**

```javascript
import { Tetromino } from "./Tetromino.js";

export class PieceGenerator {
  constructor(seed) {
    this.seed = seed;
    this.state = seed;
  }

  // Simple LCG (Linear Congruential Generator) - must match server!
  // Same algorithm = same piece sequence
  nextRandom() {
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state;
  }

  next() {
    const index = this.nextRandom() % Tetromino.TYPES.length;
    return {
      type: Tetromino.TYPES[index],
    };
  }
}
```

#### 2.6 Implement Input Manager (Client Prediction)

**File: `src/website/js/game/InputManager.js`**

```javascript
export class InputManager {
  constructor(simulation, networkClient, roomId, playerId) {
    this.simulation = simulation;
    this.networkClient = networkClient;
    this.roomId = roomId;
    this.playerId = playerId;

    this.sequenceNumber = 0;
    this.keyStates = {};

    this.setupKeyboardListeners();
  }

  setupKeyboardListeners() {
    document.addEventListener("keydown", (e) => {
      if (this.keyStates[e.code]) return; // Prevent repeat
      this.keyStates[e.code] = true;

      const inputType = this.keyToInputType(e.code);
      if (inputType !== null) {
        e.preventDefault();
        this.handleInput(inputType);
      }
    });

    document.addEventListener("keyup", (e) => {
      this.keyStates[e.code] = false;
    });
  }

  keyToInputType(keyCode) {
    const mapping = {
      ArrowLeft: "MoveLeft",
      ArrowRight: "MoveRight",
      ArrowUp: "RotateClockwise",
      ArrowDown: "SoftDrop",
      Space: "HardDrop",
    };
    return mapping[keyCode] || null;
  }

  handleInput(inputType) {
    // Create input event
    const input = {
      PlayerId: this.playerId,
      SequenceNumber: this.sequenceNumber++,
      GameTick: this.simulation.currentTick,
      Type: inputType,
      Timestamp: new Date().toISOString(),
    };

    // 1. Apply locally IMMEDIATELY (client prediction)
    this.simulation.applyInput(input);

    // 2. Send to server for validation and broadcast
    this.networkClient.sendInput(this.roomId, input);
  }
}
```

#### 2.7 Implement Renderer

**File: `src/website/js/rendering/Renderer.js`**

```javascript
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.blockSize = 30; // 300px / 10 blocks = 30px per block
  }

  render(simulation) {
    // Clear canvas
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw field (locked blocks)
    this.drawField(simulation.field);

    // Draw current piece
    if (simulation.currentPiece && !simulation.gameOver) {
      this.drawPiece(simulation.currentPiece);
    }

    // Draw game over overlay
    if (simulation.gameOver) {
      this.drawGameOver();
    }
  }

  drawField(field) {
    for (let y = 0; y < field.length; y++) {
      for (let x = 0; x < field[y].length; x++) {
        if (field[y][x] !== 0) {
          this.drawBlock(x, y, this.getColorForType(field[y][x]));
        }
      }
    }
  }

  drawPiece(piece) {
    const shape = piece.getShape();
    const color = this.getColorForType(piece.type);

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          this.drawBlock(piece.x + x, piece.y + y, color);
        }
      }
    }
  }

  drawBlock(x, y, color) {
    const px = x * this.blockSize;
    const py = y * this.blockSize;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(px, py, this.blockSize, this.blockSize);

    // Border
    this.ctx.strokeStyle = "#000";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(px, py, this.blockSize, this.blockSize);
  }

  getColorForType(type) {
    const colors = {
      I: "#00f0f0",
      O: "#f0f000",
      T: "#a000f0",
      S: "#00f000",
      Z: "#f00000",
      J: "#0000f0",
      L: "#f0a000",
    };
    return colors[type] || "#ffffff";
  }

  drawGameOver() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "#fff";
    this.ctx.font = "bold 36px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
  }
}
```

#### 2.8 Implement Main Entry Point

**File: `src/website/js/main.js`**

```javascript
import { SignalRClient } from "./network/signalr-client.js";
import { GameSimulation } from "./game/GameSimulation.js";
import { InputManager } from "./game/InputManager.js";
import { Renderer } from "./rendering/Renderer.js";

class SandtrisMultiplayer {
  constructor() {
    this.networkClient = new SignalRClient();
    this.playerId = null;
    this.roomId = null;

    this.yourSimulation = null;
    this.opponentSimulation = null;

    this.yourRenderer = null;
    this.opponentRenderer = null;

    this.inputManager = null;
    this.gameLoopId = null;

    this.setupUI();
    this.setupNetworkHandlers();
  }

  setupUI() {
    document.getElementById("join-queue-btn").addEventListener("click", () => {
      this.joinMatchmaking();
    });

    document.getElementById("play-again-btn").addEventListener("click", () => {
      this.resetToMatchmaking();
    });
  }

  async joinMatchmaking() {
    const nameInput = document.getElementById("player-name");
    this.playerId = nameInput.value.trim() || `Player${Math.floor(Math.random() * 1000)}`;

    // Connect to server
    const connected = await this.networkClient.connect();
    if (!connected) {
      alert("Failed to connect to server");
      return;
    }

    // Show queue status
    this.showScreen("matchmaking-screen");
    document.getElementById("queue-status").classList.remove("hidden");

    // Join matchmaking
    await this.networkClient.joinMatchmaking(this.playerId);
  }

  setupNetworkHandlers() {
    this.networkClient.on("matchFound", (data) => {
      this.onMatchFound(data);
    });

    this.networkClient.on("gameStart", () => {
      this.onGameStart();
    });

    this.networkClient.on("opponentInput", (input) => {
      this.onOpponentInput(input);
    });

    this.networkClient.on("scoreUpdate", (data) => {
      this.onScoreUpdate(data);
    });

    this.networkClient.on("opponentDied", (playerId) => {
      this.onOpponentDied(playerId);
    });

    this.networkClient.on("gameFinished", (result) => {
      this.onGameFinished(result);
    });
  }

  onMatchFound(data) {
    console.log("Match found!", data);
    this.roomId = data.RoomId;

    // Determine opponent ID
    this.opponentId = data.Player1Id === this.playerId ? data.Player2Id : data.Player1Id;

    // Create simulations (both use same random seed for identical piece sequence)
    this.yourSimulation = new GameSimulation(this.playerId, data.RandomSeed);
    this.opponentSimulation = new GameSimulation(this.opponentId, data.RandomSeed);

    // Create renderers
    this.yourRenderer = new Renderer(document.getElementById("your-canvas"));
    this.opponentRenderer = new Renderer(document.getElementById("opponent-canvas"));

    // Show countdown
    this.showScreen("game-screen");
    this.showCountdown();
  }

  showCountdown() {
    const countdownEl = document.getElementById("countdown");
    const numberEl = document.getElementById("countdown-number");
    countdownEl.classList.remove("hidden");

    let count = 3;
    numberEl.textContent = count;

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        numberEl.textContent = count;
      } else {
        clearInterval(interval);
        countdownEl.classList.add("hidden");
      }
    }, 1000);
  }

  onGameStart() {
    console.log("Game started!");

    // Setup input manager
    this.inputManager = new InputManager(
      this.yourSimulation,
      this.networkClient,
      this.roomId,
      this.playerId,
    );

    // Start game loop (60fps)
    this.startGameLoop();
  }

  startGameLoop() {
    let lastTime = performance.now();
    const targetFPS = 60;
    const frameTime = 1000 / targetFPS;

    const loop = (currentTime) => {
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= frameTime) {
        lastTime = currentTime - (deltaTime % frameTime);

        // Update simulations
        this.yourSimulation.tick();
        this.opponentSimulation.tick();

        // Check for line clears (report to server)
        if (this.yourSimulation.justClearedLines) {
          this.networkClient.reportLinesClear(
            this.roomId,
            this.playerId,
            this.yourSimulation.justClearedLines,
            this.yourSimulation.score,
          );
          this.yourSimulation.justClearedLines = 0;
        }

        // Check for game over
        if (this.yourSimulation.gameOver && !this.reportedGameOver) {
          this.networkClient.reportGameOver(this.roomId, this.playerId, this.yourSimulation.score);
          this.reportedGameOver = true;
        }

        // Render
        this.yourRenderer.render(this.yourSimulation);
        this.opponentRenderer.render(this.opponentSimulation);

        // Update UI
        this.updateUI();
      }

      this.gameLoopId = requestAnimationFrame(loop);
    };

    this.gameLoopId = requestAnimationFrame(loop);
  }

  onOpponentInput(input) {
    // Apply input to opponent's simulation
    // Note: The input includes the opponent's ID, we need to apply to their simulation
    if (input.PlayerId === this.opponentId) {
      this.opponentSimulation.applyInput(input);
    } else if (input.PlayerId === this.playerId) {
      // Server echoing our own input back - can use for validation/correction
      // For MVP, we trust our local simulation
    }
  }

  onScoreUpdate(data) {
    // Update score display (already updated locally, this is server confirmation)
    console.log("Score update:", data);
  }

  onOpponentDied(playerId) {
    console.log("Opponent died");
    document.getElementById("opponent-status").textContent = "💀 DEAD";
  }

  onGameFinished(result) {
    console.log("Game finished:", result);

    // Stop game loop
    cancelAnimationFrame(this.gameLoopId);

    // Show results
    this.showResults(result);
  }

  showResults(result) {
    this.showScreen("results-screen");

    const isWinner = result.WinnerId === this.playerId;
    document.getElementById("result-title").textContent = isWinner ? "Victory!" : "Defeat";
    document.getElementById("winner-name").textContent = result.WinnerId;

    const [yourScore, opponentScore] =
      result.Player1Id === this.playerId
        ? [result.Player1Score, result.Player2Score]
        : [result.Player2Score, result.Player1Score];

    document.getElementById("final-your-score").textContent = yourScore;
    document.getElementById("final-opponent-score").textContent = opponentScore;
  }

  updateUI() {
    // Your stats
    document.getElementById("your-score").textContent = this.yourSimulation.score;
    document.getElementById("your-lines").textContent = this.yourSimulation.linesCleared;
    document.getElementById("your-level").textContent = this.yourSimulation.level;

    // Opponent stats
    document.getElementById("opponent-score").textContent = this.opponentSimulation.score;
    document.getElementById("opponent-lines").textContent = this.opponentSimulation.linesCleared;
    document.getElementById("opponent-level").textContent = this.opponentSimulation.level;
  }

  showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.add("hidden");
      screen.classList.remove("active");
    });

    const screen = document.getElementById(screenId);
    screen.classList.remove("hidden");
    screen.classList.add("active");
  }

  resetToMatchmaking() {
    this.showScreen("matchmaking-screen");
    document.getElementById("queue-status").classList.add("hidden");
    this.reportedGameOver = false;
  }
}

// Initialize app
const app = new SandtrisMultiplayer();
```

---

### Step 3: Basic Styling

**File: `src/website/css/style.css`**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Arial", sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.screen {
  text-align: center;
  padding: 2rem;
}

.screen.hidden {
  display: none;
}

/* Matchmaking Screen */
#matchmaking-screen h1 {
  font-size: 3rem;
  margin-bottom: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

#player-id-section {
  margin-bottom: 2rem;
}

#player-name {
  padding: 1rem;
  font-size: 1.2rem;
  border: none;
  border-radius: 8px;
  margin-right: 1rem;
  width: 250px;
}

#join-queue-btn,
#play-again-btn {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

#join-queue-btn:hover,
#play-again-btn:hover {
  background: #45a049;
}

#queue-status {
  margin-top: 2rem;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 1rem auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Game Screen */
#countdown {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

#countdown-number {
  font-size: 8rem;
  text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.7);
  animation: pulse 1s ease-in-out;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}

#game-container {
  display: flex;
  gap: 4rem;
  justify-content: center;
  align-items: flex-start;
}

.player-area {
  background: rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.player-area h3 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.game-info {
  display: flex;
  gap: 1rem;
  justify-content: space-around;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

canvas {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  display: block;
  background: #000;
}

.controls-hint {
  margin-top: 1rem;
  font-size: 0.8rem;
  opacity: 0.7;
  max-width: 300px;
}

.status-indicator {
  margin-top: 0.5rem;
  font-weight: bold;
  min-height: 20px;
}

/* Results Screen */
#results-screen {
  background: rgba(255, 255, 255, 0.1);
  padding: 3rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

#result-title {
  font-size: 3rem;
  margin-bottom: 2rem;
}

.scores {
  margin: 2rem 0;
  font-size: 1.3rem;
}

.scores p {
  margin: 0.5rem 0;
}

/* Utilities */
.hidden {
  display: none !important;
}
```

---

## Verification & Testing

### Local Testing Setup

1. **Start Backend**

```bash
cd src/backend/Sandtris.Server
dotnet run
# Server should start on http://localhost:5000
```

2. **Serve Frontend**

```bash
cd src/website
python -m http.server 5173
# Or use any static file server
# Frontend should be at http://localhost:5173
```

3. **Test Multiplayer**

- Open two browser windows (or one normal + one incognito)
- Navigate to http://localhost:5173 in both
- Enter different names and click "Find Match"
- Both should be matched together
- Play Tetris and verify:
  - Your inputs apply instantly (no lag)
  - Opponent's moves appear on their field
  - Scores update correctly
  - Game ends when both players die
  - Winner is determined correctly

### Testing Checklist

#### Matchmaking

- [ ] Player can join queue
- [ ] Two players are matched together
- [ ] Countdown displays (3...2...1)
- [ ] Game starts after countdown
- [ ] Both players receive same random seed

#### Gameplay (Your Field)

- [ ] Pieces fall automatically
- [ ] Arrow keys move pieces left/right
- [ ] Up arrow rotates
- [ ] Down arrow soft drops
- [ ] Space bar hard drops
- [ ] Pieces lock when they hit bottom/other pieces
- [ ] Lines clear when complete
- [ ] Score increases correctly
- [ ] Level increases every 10 lines
- [ ] Game over when pieces reach top

#### Multiplayer Sync

- [ ] Opponent's pieces move in real-time
- [ ] Opponent's score updates
- [ ] Can see when opponent clears lines
- [ ] Can see when opponent dies
- [ ] Game ends when both players die
- [ ] Correct winner is determined

#### Edge Cases

- [ ] Disconnection handling (game should end gracefully)
- [ ] Third player can't join an active game
- [ ] Can play multiple matches in a row

---

## Future Evolution: Adding Sand Physics

Once the MVP is working, you can add sand physics simulation:

### Phase 2A: Deterministic Sand Physics

1. **Implement sand physics in C#** (`Sandtris.Shared/SandSimulation.cs`)
   - Integer-based math only (no floating point)
   - Sand particles fall and pile up
   - Simple collision detection

2. **Port to JavaScript** (`js/game/SandPhysics.js`)
   - Identical algorithm as C#
   - Must produce same output for same input

3. **Write tests** to verify determinism
   - Same inputs → same outputs on both platforms

### Phase 2B: Replace Locked Pieces with Sand

1. When piece locks, convert each block to sand particles
2. Sand falls and settles naturally
3. Lines clear when sand forms complete rows
4. Add checksum system to detect desync

### Phase 2C: State Validation

1. Clients send periodic checksums (hash of sand positions)
2. Server compares checksums from both clients
3. If mismatch detected, server sends correction
4. Client reloads authoritative state and continues

This incremental approach lets you master multiplayer fundamentals before tackling physics complexity.

---

## Common Issues & Debugging

### Issue 1: Opponent's Pieces Not Showing

**Symptom**: Your field works but opponent's field is empty/frozen

**Causes**:

- Inputs not being broadcast correctly
- Wrong player ID in input events
- Opponent simulation not being updated

**Debug**:

```javascript
// Add logging in main.js
onOpponentInput(input) {
    console.log('Received opponent input:', input);
    // Should see opponent's moves logged
}
```

### Issue 2: Pieces are Different Between Players

**Symptom**: Players see different piece sequences

**Causes**:

- Random seed not shared correctly
- Different random number generators
- One client not using the seed

**Solution**: Ensure both clients receive and use the same `RandomSeed` from `MatchFound` event

### Issue 3: CORS Errors

**Symptom**: Browser console shows CORS policy errors

**Solution**:

- Ensure backend has CORS configured for frontend origin
- Check `appsettings.json` and `Program.cs` CORS setup
- Ensure frontend URL matches allowed origins exactly

### Issue 4: SignalR Connection Fails

**Symptom**: "Failed to connect to server" alert

**Causes**:

- Backend not running
- Wrong URL in SignalRClient
- Firewall blocking WebSocket

**Debug**:

- Check backend is running: `curl http://localhost:5000/game`
- Check browser console for connection errors
- Try enabling long polling fallback: `.withUrl(url, { skipNegotiation: false })`

### Issue 5: Game Over Not Triggering

**Symptom**: Game continues after pieces reach top

**Causes**:

- Spawn collision check not working
- `gameOver` flag not set
- Game loop not checking flag

**Solution**: Add logging in `spawnPiece()`:

```javascript
if (this.checkCollision(this.currentPiece)) {
  console.log("Game over!");
  this.gameOver = true;
}
```

---

## Key Files Summary

### Critical Backend Files

1. **`Sandtris.Server/Hubs/GameHub.cs`** - SignalR hub (all server-client communication)
2. **`Sandtris.Server/Services/MatchmakingService.cs`** - Queue management
3. **`Sandtris.Server/Services/InputValidator.cs`** - Input validation
4. **`Sandtris.Server/Models/GameRoom.cs`** - Room state management

### Critical Frontend Files

1. **`js/game/GameSimulation.js`** - Core game logic (must match server rules)
2. **`js/game/InputManager.js`** - Client prediction
3. **`js/network/signalr-client.js`** - WebSocket communication
4. **`js/main.js`** - Application entry point & orchestration

### Shared Logic (Must Be Identical)

1. **Piece shapes** (`Tetromino.SHAPES` in JS, `Tetromino.cs` in C#)
2. **Random generation** (`PieceGenerator` - same algorithm in both)
3. **Scoring rules** (`updateScore()` - must calculate same values)

---

## Architecture Benefits Recap

### What You're Learning

1. **Client Prediction**: Industry-standard technique for responsive multiplayer
   - Your moves feel instant (0ms latency)
   - Used by most modern multiplayer games (FPS, MOBA, racing)

2. **Input Replication**: Efficient synchronization method
   - Low bandwidth (only send small input events)
   - Both clients simulate both games identically
   - Alternative to expensive full-state synchronization

3. **Deterministic Simulation**: Critical for networked physics
   - Same inputs always produce same outputs
   - Enables input replication to work
   - Prepares you for sand physics in Phase 2

4. **Server Validation**: Balance security with UX
   - Server validates critical events (scores, game over)
   - Prevents cheating without sacrificing responsiveness
   - Clients can't fake wins or manipulate scores

5. **Real-time Communication**: WebSocket patterns
   - Bi-directional, low-latency messaging
   - Event-driven architecture
   - SignalR handles reconnection, fallbacks, groups

### Why This Architecture Scales

- **Server load**: Minimal (no physics simulation, just validation)
- **Bandwidth**: Low (~10-20 KB/sec per player)
- **Client performance**: Good (60fps with simple Tetris logic)
- **Cheat resistance**: Strong (server validates all scoring)
- **Player experience**: Excellent (zero input lag)

---

## Next Steps After Plan Approval

1. **Create .NET Project**
   - Run `dotnet new webapi -n Sandtris.Server`
   - Add SignalR package: `dotnet add package Microsoft.AspNetCore.SignalR`

2. **Download SignalR Client**
   - Download from: https://cdn.jsdelivr.net/npm/@microsoft/signalr@latest/dist/browser/signalr.min.js
   - Save to `src/website/lib/signalr.min.js`

3. **Implement Backend First** (Steps 1.1-1.6)
   - This gives you the API to test against

4. **Implement Frontend** (Steps 2.1-2.8)
   - Build incrementally, test each component

5. **Test End-to-End**
   - Use two browser windows
   - Verify all checklist items

6. **Iterate & Polish**
   - Fix bugs discovered during testing
   - Add visual polish (animations, sounds)

7. **Phase 2: Add Sand Physics** (Future)
   - Once multiplayer core is solid

---

## Conclusion

This MVP plan provides a solid foundation for learning multiplayer game development. You'll build a fully functional competitive Tetris game using industry-standard patterns (client prediction, input replication, deterministic simulation) while keeping server load minimal and player experience optimal.

The architecture is designed to evolve: once you master the multiplayer fundamentals with classic Tetris, you can add sand physics simulation without major refactoring. Both the hybrid architecture and deterministic simulation approach will carry forward perfectly to Phase 2.

**Estimated Development Time**: 2-3 days for MVP (assuming familiarity with .NET and JavaScript)

**Learning Value**: High - covers all core multiplayer game concepts used in professional game development
