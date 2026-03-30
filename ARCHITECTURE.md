# Sandtris Multiplayer - Architecture Documentation

## Overview

Sandtris Multiplayer is a real-time multiplayer tetris game with sand physics simulation. The architecture implements a **hybrid client prediction** model for responsive gameplay with server validation.

## System Architecture

```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│   Frontend      │◄──────────────────────────►│    Backend      │
│   (Vue 3)       │    JSON Event Messages     │  (.NET 10 API)  │
└─────────────────┘                            └─────────────────┘
        │                                               │
        ├─ TetrisGame Component                        ├─ GameWebSocketEndpoint
        ├─ WebSocketClient                             ├─ WebSocketEventBus
        ├─ SandSimulation                              ├─ GameService
        └─ useWebSocket Composable                     └─ MatchQueueService
```

## Architecture Decisions & Trade-offs

### 1. Hybrid Client Prediction

**Decision**: Each client simulates their own game locally and broadcasts actions to opponents.

**Advantages**:

- ✅ Zero input lag - immediate visual feedback
- ✅ Responsive gameplay even with network latency
- ✅ Server validates critical events (match lifecycle, queue management)
- ✅ Reduced server computational load

**Trade-offs**:

- ⚠️ Potential desync if implementations differ between client and server
- ⚠️ Clients trust each other's reported state (acceptable for casual gameplay)
- ⚠️ Not suitable for highly competitive/ranked scenarios without server-side replay validation

**Why Chosen**: Prioritizes player experience and learning modern multiplayer patterns over strict competitive integrity (MVP scope).

---

### 2. Event-Driven WebSocket Communication

**Decision**: All communication uses typed event messages wrapped in a standardized envelope.

**Message Format**:

```typescript
{
  sentAt: ISO8601 timestamp,
  event: {
    eventType: string,
    ...event-specific payload
  },
  version: number
}
```

**Advantages**:

- ✅ Type-safe event handling on both ends
- ✅ Easy to add new event types without breaking existing code
- ✅ Version field enables protocol evolution
- ✅ Timestamp helps with debugging and event ordering

**Trade-offs**:

- ⚠️ Slightly larger message size than minimal binary protocol
- ⚠️ JSON serialization overhead (acceptable for this use case)

**Why Chosen**: Developer experience, maintainability, and debuggability outweigh minimal performance cost for this game's scale.

---

### 3. Single WebSocket Connection Per Client

**Decision**: One persistent WebSocket handles all real-time communication (lobby, match events, player actions).

**Advantages**:

- ✅ Simple client implementation
- ✅ Reduced connection overhead
- ✅ Easier state management (one connection lifecycle to track)

**Trade-offs**:

- ⚠️ All traffic flows through one connection (potential bottleneck at scale)
- ⚠️ Connection loss affects all features simultaneously

**Why Chosen**: Simplicity and cost-effectiveness for expected player counts. Can be refactored to multiple connections if needed.

---

### 4. Match Subscription Model

**Decision**: Clients explicitly subscribe/unsubscribe to match event streams using matchId.

**Flow**:

```
1. Player joins queue → HTTP POST /api/match-queue/join
2. Match found → Server sends match-started event
3. Client subscribes → WS: subscribe-to-match(matchId, playerId)
4. Game events broadcast → Only subscribed clients receive
5. Match ends → Client unsubscribes
```

**Advantages**:

- ✅ Clients only receive relevant events
- ✅ Server knows exactly which connections care about which matches
- ✅ Easy to implement spectator mode later (subscribe without playing)

**Trade-offs**:

- ⚠️ Client must manually manage subscriptions
- ⚠️ Network issues during subscribe could cause client to miss events

**Why Chosen**: Scalability and flexibility for future features (spectating, replays, etc.).

---

### 5. Client-Side Sand Physics Simulation

**Decision**: Sand physics run independently on each client (not synced particle-by-particle).

**Advantages**:

- ✅ No network bandwidth for physics state
- ✅ Smooth 60fps physics regardless of network conditions
- ✅ Server doesn't need physics engine

**Trade-offs**:

- ⚠️ Physics must be deterministic or visuals will differ between clients
- ⚠️ Sand settling might look slightly different for each player

**Why Chosen**: Physics simulation is compute-intensive and latency-sensitive. Syncing high-level actions (piece movements) is sufficient for gameplay while physics remains smooth.

---

### 6. REST API for Queue Operations + WebSocket for Events

**Decision**: Queue join/leave uses HTTP REST, but queue updates stream via WebSocket.

**Rationale**:

```
HTTP POST /api/match-queue/join    ← Action that expects immediate response
WebSocket queue-updated event       ← Real-time notification to all waiting players
```

**Advantages**:

- ✅ REST provides clear success/failure response for actions
- ✅ WebSocket provides low-latency updates to all interested clients
- ✅ Standard HTTP semantics for stateful operations

**Trade-offs**:

- ⚠️ Dual protocol increases complexity slightly
- ⚠️ Must keep HTTP and WebSocket state in sync

**Why Chosen**: Leverages strengths of each protocol - REST for request/response, WebSocket for push notifications.

---

## Event Streaming Implementation

### Player Actions → Opponent Sync

```
Player 1 Input                    Backend                      Player 2 View
    │                                │                              │
    ├─ Press Left Arrow              │                              │
    ├─ Move piece locally            │                              │
    ├─ Send player-input ───────────►│                              │
    │   (deltaX: -1, deltaY: 0)      │                              │
    │                                ├─ Broadcast to match ────────►│
    │                                │                              ├─ Apply movement
    │                                │                              └─ Render opponent's piece
```

**Events**:

- `player-input`: Movement (deltaX, deltaY), rotation, or drop
- `piece-spawned`: New tetris piece spawned

**Data Flow**:

1. Player performs action
2. Client applies action immediately (prediction)
3. Client sends event to backend
4. Backend broadcasts event to all players in match
5. Opponents receive and apply action to their view of that player's board

---

## Technology Stack

### Backend (.NET 10)

- **FastEndpoints**: HTTP endpoint routing
- **System.Net.WebSockets**: Native WebSocket support
- **System.Text.Json**: Event serialization
- **Concurrent collections**: Thread-safe connection management

### Frontend (Vue 3 + TypeScript)

- **Vue 3 Composition API**: Reactive component model
- **Canvas API**: Game rendering
- **WebSocket API**: Real-time communication
- **TypeScript**: Type-safe event handling

---

## Key Design Patterns

### 1. **Singleton WebSocket Client**

```typescript
let wsClient: WebSocketClient | null = null; // Shared across components

export function useWebSocket() {
  if (!wsClient) {
    wsClient = new WebSocketClient(WS_URL);
  }
  return {
    /* composable methods */
  };
}
```

Single connection shared via composable pattern.

### 2. **Event Bus Pattern (Backend)**

```csharp
WebSocketEventBus
  ├─ RegisterConnection(socket) → connectionId
  ├─ SubscribeToMatch(connectionId, matchId)
  └─ PublishToMatchAsync(matchId, event)
```

Centralized event routing to subscribed connections.

### 3. **Polymorphic Event Deserialization**

Custom JSON converter handles interface types:

```csharp
IPlayerInputData
  ├─ MoveInputData(deltaX, deltaY)
  ├─ RotateInputData(clockwise)
  └─ DropInputData
```

Discriminated by `dataTypeName` field.

---

## File Structure

```
src/
├── backend/SandtrisServer/
│   ├── Features/
│   │   ├── Game/
│   │   │   ├── GameWebSocketEndpoint.cs       # WebSocket connection handler
│   │   │   ├── GameService.cs                 # Game event orchestration
│   │   │   ├── WebSocketEventBus.cs           # Event pub/sub infrastructure
│   │   │   ├── IPlayerInputData.cs            # Input action types
│   │   │   ├── PlayerInputDataConverter.cs    # JSON polymorphic deserializer
│   │   │   └── Model/
│   │   │       ├── IEvent.cs                  # Base event interface
│   │   │       ├── WebSocketEventTypes.cs     # All event definitions
│   │   │       └── WebSocketMessageWrapper.cs # Message envelope
│   │   └── MatchQueue/
│   │       ├── MatchQueueService.cs           # Queue management
│   │       └── MatchQueueEndpoints.cs         # HTTP queue endpoints
│   └── Program.cs                             # App startup
│
└── website/src/
    ├── components/
    │   ├── TetrisGame.vue                     # Game logic + rendering
    │   ├── GameScreen.vue                     # 2-player match UI
    │   └── MatchQueue.vue                     # Lobby queue UI
    ├── services/
    │   ├── websocket/
    │   │   ├── WebSocketClient.ts             # Low-level WS connection
    │   │   ├── useWebSocket.ts                # Vue composable
    │   │   ├── types.ts                       # TypeScript event types
    │   │   └── constants.ts                   # Event type strings
    │   └── SandtrisService.ts                 # HTTP API client
    ├── game/
    │   ├── SandSimulation.ts                  # Physics engine
    │   └── TetrisPiece.ts                     # Tetris shape definitions
    └── App.vue                                # Root component
```

---

## Future Considerations

### Scalability

- **Current**: Single server, in-memory state
- **Path to scale**: Add Redis for connection state, enable horizontal scaling
- **Match sharding**: Distribute matches across servers by matchId hash

### Security

- **Current**: Trust-based model (players report their own state)
- **Improvements**: Add server-side replay validation, rate limiting, input bounds checking

### Features

- **Spectator mode**: Reuse subscription system without sending inputs
- **Replays**: Store event logs, replay deterministically
- **Rankings**: Requires server-side validation of critical events

---

## Performance Characteristics

### Latency

- **Input → Visual feedback**: 0ms (local prediction)
- **Input → Opponent sees**: ~50-150ms (network RTT + render frame)

### Bandwidth (per player)

- **Input events**: ~10-30 events/sec × ~100 bytes = ~1-3 KB/sec
- **Negligible** for modern networks

### Server Load

- **Per match**: ~40-60 events/sec routed to 2+ connections
- **Bottleneck**: Network I/O (WebSocket send), not CPU

---

## Testing Strategy

### Unit Tests

- Event serialization/deserialization
- WebSocketEventBus subscription logic
- Match queue state transitions

### Integration Tests

- WebSocket connection lifecycle
- Event routing to correct subscribers
- HTTP + WebSocket state consistency

### Manual Testing

- Two browser windows, local multiplayer
- Network throttling to simulate latency
- Rapid input spam to test event handling

---

## Known Limitations

1. **No reconnection handling**: If WebSocket drops, game state is lost
2. **No input validation**: Malicious client could send invalid moves
3. **No server-side physics**: Can't detect impossible game states
4. **No persistence**: Match state lost on server restart

These are **acceptable for MVP** and can be addressed in future iterations.
