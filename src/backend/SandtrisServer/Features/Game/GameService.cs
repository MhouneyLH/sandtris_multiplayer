using SandtrisServer.Features.Game.Model;

namespace SandtrisServer.Features.Game;

public sealed class GameService(WebSocketEventBus eventBus, ILogger<GameService> logger)
{
    private readonly WebSocketEventBus _eventBus = eventBus;
    private readonly ILogger<GameService> _logger = logger;

    public Task HandleClientMatchStartedAsync(
        string connectionId,
        string? matchId,
        EventTypes.MatchStartedEvent @event,
        CancellationToken cancellationToken = default)
    {
        var normalizedMatchId = string.IsNullOrWhiteSpace(matchId) ? @event.MatchId : matchId.Trim();

        _logger.LogDebug(
            "Relayed client event {EventType} for match {MatchId} from connection {ConnectionId}.",
            EventTypes.MatchStartedEvent.EventTypeName,
            normalizedMatchId,
            connectionId);

        return _eventBus.PublishToMatchAsync(normalizedMatchId, @event, cancellationToken);
    }

    public Task HandleClientMatchEndedAsync(
        string connectionId,
        string? matchId,
        EventTypes.MatchEndedEvent @event,
        CancellationToken cancellationToken = default)
    {
        var normalizedMatchId = string.IsNullOrWhiteSpace(matchId) ? @event.MatchId : matchId.Trim();

        _logger.LogDebug(
            "Relayed client event {EventType} for match {MatchId} from connection {ConnectionId}.",
            EventTypes.MatchEndedEvent.EventTypeName,
            normalizedMatchId,
            connectionId);

        return _eventBus.PublishToMatchAsync(normalizedMatchId, @event, cancellationToken);
    }

    public Task BroadcastMatchStartedAsync(string matchId, EventTypes.MatchStartedEvent payload, CancellationToken cancellationToken = default)
    {
        return _eventBus.PublishToMatchAsync(matchId, payload, cancellationToken);
    }

    public Task BroadcastMatchEndedAsync(string matchId, EventTypes.MatchEndedEvent payload, CancellationToken cancellationToken = default)
    {
        return _eventBus.PublishToMatchAsync(matchId, payload, cancellationToken);
    }

    public Task BroadcastPlayerInputAsync(string connectionId, string matchId, EventTypes.PlayerInputEvent payload, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug(
            "Broadcasting player input from {PlayerId} in match {MatchId} ({InputType}).",
            payload.PlayerId,
            matchId,
            payload.PlayerInputData.GetType().Name);

        return _eventBus.PublishToMatchAsync(matchId, payload, cancellationToken);
    }

    public Task BroadcastPieceSpawnedAsync(string connectionId, string matchId, EventTypes.PieceSpawnedEvent payload, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug(
            "Broadcasting piece spawned for {PlayerId} in match {MatchId}.",
            payload.PlayerId,
            matchId);

        return _eventBus.PublishToMatchAsync(matchId, payload, cancellationToken);
    }
}
