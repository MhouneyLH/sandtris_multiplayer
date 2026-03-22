using System.Collections.Concurrent;
using SandtrisServer.Features.Game;

namespace SandtrisServer.Features.MatchQueue;

public sealed class MatchQueueService(ILogger<MatchQueueService> logger, WebSocketEventBus webSocketEventBus)
{
    private readonly ConcurrentDictionary<string, DateTime> _queue = new();
    private readonly ILogger<MatchQueueService> _logger = logger;
    private readonly WebSocketEventBus _webSocketEventBus = webSocketEventBus;
    private readonly SemaphoreSlim _matchmakingLock = new(1, 1);

    private const int MaxQueueSize = 200;

    public async Task JoinQueueAsync(string playerId)
    {
        if (IsQueueLimitReached())
        {
            _logger.LogWarning("Player {PlayerId} attempted to join the match queue but the queue is full.", playerId);
            throw new InvalidOperationException("Match queue is full. Please try again later.");
        }

        _logger.LogInformation("Player {PlayerId} joined the match queue.", playerId);

        _queue[playerId] = DateTime.UtcNow;

        await _webSocketEventBus.PublishToMatchAsync(
            matchId: WebSocketMessageDefaults.LobbyMatchId,
            eventType: WebSocketEventTypes.QueueUpdated,
            data: new QueueUpdatedPayload(QueueSize: _queue.Count, PlayerId: playerId, Action: QueueUpdateAction.Joined));

        _logger.LogInformation("Successfully published queue update event for player {PlayerId} joining the queue.", playerId);

        await TryCreateMatchAsync();
    }

    public async Task LeaveQueueAsync(string playerId)
    {
        if (!_queue.TryRemove(playerId, out _))
        {
            _logger.LogWarning("Player {PlayerId} attempted to leave the match queue but was not found.", playerId);
            throw new InvalidOperationException("Player is not in the match queue.");
        }

        _logger.LogInformation("Player {PlayerId} left the match queue.", playerId);

        await _webSocketEventBus.PublishToMatchAsync(
            matchId: WebSocketMessageDefaults.LobbyMatchId,
            eventType: WebSocketEventTypes.QueueUpdated,
            data: new QueueUpdatedPayload(QueueSize: _queue.Count, PlayerId: playerId, Action: QueueUpdateAction.Left));

        _logger.LogInformation("Successfully published queue update event for player {PlayerId} leaving the queue.", playerId);
    }

    public int GetQueueSize() => _queue.Count;

    private bool IsQueueLimitReached() => _queue.Count >= MaxQueueSize;

    private async Task TryCreateMatchAsync()
    {
        await _matchmakingLock.WaitAsync();

        try
        {
            while (_queue.Count >= 2)
            {
                var candidates = _queue
                    .OrderBy(entry => entry.Value)
                    .ThenBy(entry => entry.Key, StringComparer.Ordinal)
                    .Take(2)
                    .ToArray();

                if (candidates.Length < 2)
                {
                    return;
                }

                var playerA = candidates[0].Key;
                var playerB = candidates[1].Key;

                if (!_queue.TryRemove(playerA, out _) || !_queue.TryRemove(playerB, out _))
                {
                    continue;
                }

                var matchId = $"match-{Guid.NewGuid():N}";
                var players = new[] { playerA, playerB };

                _logger.LogInformation(
                    "Created match {MatchId} with players {PlayerA} and {PlayerB}.",
                    matchId,
                    playerA,
                    playerB);

                await _webSocketEventBus.PublishToMatchAsync(
                    matchId: WebSocketMessageDefaults.LobbyMatchId,
                    eventType: WebSocketEventTypes.MatchStarted,
                    data: new MatchStartedPayload(matchId, players));

                await _webSocketEventBus.PublishToMatchAsync(
                    matchId: WebSocketMessageDefaults.LobbyMatchId,
                    eventType: WebSocketEventTypes.QueueUpdated,
                    data: new QueueUpdatedPayload(QueueSize: _queue.Count, PlayerId: playerA, Action: QueueUpdateAction.Left));

                await _webSocketEventBus.PublishToMatchAsync(
                    matchId: WebSocketMessageDefaults.LobbyMatchId,
                    eventType: WebSocketEventTypes.QueueUpdated,
                    data: new QueueUpdatedPayload(QueueSize: _queue.Count, PlayerId: playerB, Action: QueueUpdateAction.Left));
            }
        }
        finally
        {
            _matchmakingLock.Release();
        }
    }
}