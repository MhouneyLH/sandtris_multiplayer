using System.Collections.Concurrent;

namespace SandtrisServer.Features.MatchQueue;

public sealed class MatchQueueService(ILogger<MatchQueueService> logger)
{
    private readonly ConcurrentDictionary<string, DateTime> _queue = new();
    private readonly ILogger<MatchQueueService> _logger = logger;

    public async Task JoinQueueAsync(string playerId)
    {
        if (IsQueueLimitReached())
        {
            _logger.LogWarning("Player {PlayerId} attempted to join the match queue but the queue is full.", playerId);
            throw new InvalidOperationException("Match queue is full. Please try again later.");
        }

        _logger.LogInformation("Player {PlayerId} joined the match queue.", playerId);

        _queue[playerId] = DateTime.UtcNow;
    }

    public async Task LeaveQueueAsync(string playerId)
    {
        if (!_queue.TryRemove(playerId, out _))
        {
            _logger.LogWarning("Player {PlayerId} attempted to leave the match queue but was not found.", playerId);
            throw new InvalidOperationException("Player is not in the match queue.");
        }

        _logger.LogInformation("Player {PlayerId} left the match queue.", playerId);
    }

    public int GetQueueSize() => _queue.Count;

    private bool IsQueueLimitReached() => _queue.Count >= 200;
}