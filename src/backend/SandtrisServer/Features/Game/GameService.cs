namespace SandtrisServer.Features.Game;

public sealed class GameService(WebSocketEventBus eventBus, ILogger<GameService> logger)
{
    private readonly WebSocketEventBus _eventBus = eventBus;
    private readonly ILogger<GameService> _logger = logger;

    public async Task HandleClientEventAsync(
        string connectionId,
        string eventType,
        string? matchId,
        Dictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        var normalizedMatchId = string.IsNullOrWhiteSpace(matchId) ? WebSocketMessageDefaults.LobbyMatchId : matchId.Trim();

        // For now we trust client payloads and relay as-is to all subscribers in the target match.
        await _eventBus.PublishToMatchAsync(normalizedMatchId, eventType, data, cancellationToken);

        _logger.LogDebug(
            "Relayed client event {EventType} for match {MatchId} from connection {ConnectionId}.",
            eventType,
            normalizedMatchId,
            connectionId);
    }

    public Task HandleClientMatchStartedAsync(
        string connectionId,
        string? matchId,
        MatchStartedPayload data,
        CancellationToken cancellationToken = default)
    {
        var normalizedMatchId = string.IsNullOrWhiteSpace(matchId) ? data.MatchId : matchId.Trim();

        _logger.LogDebug(
            "Relayed client event {EventType} for match {MatchId} from connection {ConnectionId}.",
            WebSocketEventTypes.MatchStarted,
            normalizedMatchId,
            connectionId);

        return _eventBus.PublishToMatchAsync(normalizedMatchId, WebSocketEventTypes.MatchStarted, data, cancellationToken);
    }

    public Task HandleClientMatchEndedAsync(
        string connectionId,
        string? matchId,
        MatchEndedPayload data,
        CancellationToken cancellationToken = default)
    {
        var normalizedMatchId = string.IsNullOrWhiteSpace(matchId) ? data.MatchId : matchId.Trim();

        _logger.LogDebug(
            "Relayed client event {EventType} for match {MatchId} from connection {ConnectionId}.",
            WebSocketEventTypes.MatchEnded,
            normalizedMatchId,
            connectionId);

        return _eventBus.PublishToMatchAsync(normalizedMatchId, WebSocketEventTypes.MatchEnded, data, cancellationToken);
    }

    public Task HandleClientGameUpdateAsync(
        string connectionId,
        string? matchId,
        GameUpdatePayload data,
        CancellationToken cancellationToken = default)
    {
        var normalizedMatchId = string.IsNullOrWhiteSpace(matchId) ? data.MatchId : matchId.Trim();

        _logger.LogDebug(
            "Relayed client event {EventType} for match {MatchId} from connection {ConnectionId}.",
            WebSocketEventTypes.GameUpdate,
            normalizedMatchId,
            connectionId);

        return _eventBus.PublishToMatchAsync(normalizedMatchId, WebSocketEventTypes.GameUpdate, data, cancellationToken);
    }

    public Task BroadcastMatchStartedAsync(string matchId, MatchStartedPayload payload, CancellationToken cancellationToken = default)
    {
        return _eventBus.PublishToMatchAsync(matchId, WebSocketEventTypes.MatchStarted, payload, cancellationToken);
    }

    public Task BroadcastMatchEndedAsync(string matchId, MatchEndedPayload payload, CancellationToken cancellationToken = default)
    {
        return _eventBus.PublishToMatchAsync(matchId, WebSocketEventTypes.MatchEnded, payload, cancellationToken);
    }

    public Task BroadcastGameUpdateAsync(string matchId, GameUpdatePayload payload, CancellationToken cancellationToken = default)
    {
        return _eventBus.PublishToMatchAsync(matchId, WebSocketEventTypes.GameUpdate, payload, cancellationToken);
    }
}
