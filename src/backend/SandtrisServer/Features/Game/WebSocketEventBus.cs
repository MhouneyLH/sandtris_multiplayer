using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text.Json;

namespace SandtrisServer.Features.Game;

public sealed class WebSocketEventBus(ILogger<WebSocketEventBus> logger)
{
    private sealed class ConnectionState(WebSocket socket)
    {
        public WebSocket Socket { get; } = socket;
        public SemaphoreSlim SendLock { get; } = new(1, 1);
    }

    private readonly ConcurrentDictionary<string, ConnectionState> _connections = new();
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> _matchSubscribers = new();
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> _connectionMatches = new();
    private readonly ILogger<WebSocketEventBus> _logger = logger;

    public string RegisterConnection(WebSocket socket)
    {
        var connectionId = Guid.NewGuid().ToString("N");
        _connections[connectionId] = new ConnectionState(socket);
        _logger.LogInformation("WebSocket connection {ConnectionId} registered.", connectionId);
        return connectionId;
    }

    public async Task UnregisterConnectionAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        if (!_connections.TryRemove(connectionId, out var state))
        {
            return;
        }

        if (_connectionMatches.TryRemove(connectionId, out var matches))
        {
            foreach (var matchId in matches.Keys)
            {
                RemoveSubscription(connectionId, matchId);
            }
        }

        if (state.Socket.State is WebSocketState.Open or WebSocketState.CloseReceived)
        {
            try
            {
                await state.Socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Connection closed", cancellationToken);
            }
            catch (OperationCanceledException)
            {
                state.Socket.Abort();
            }
            catch (WebSocketException)
            {
                // Ignore; socket may already be closed by peer.
            }
        }

        state.SendLock.Dispose();
        state.Socket.Dispose();

        _logger.LogInformation("WebSocket connection {ConnectionId} unregistered.", connectionId);
    }

    public void AbortAllConnections()
    {
        foreach (var connectionId in _connections.Keys)
        {
            if (_connections.TryRemove(connectionId, out var state))
            {
                state.Socket.Abort();
                state.Socket.Dispose();
                state.SendLock.Dispose();
            }
        }

        _connectionMatches.Clear();
        _matchSubscribers.Clear();

        _logger.LogInformation("All WebSocket connections were aborted for shutdown.");
    }

    public void SubscribeToMatch(string connectionId, string matchId)
    {
        var normalizedMatchId = NormalizeMatchId(matchId);

        var matchesForConnection = _connectionMatches.GetOrAdd(connectionId, _ => new ConcurrentDictionary<string, byte>());
        matchesForConnection[normalizedMatchId] = 0;

        var subscribers = _matchSubscribers.GetOrAdd(normalizedMatchId, _ => new ConcurrentDictionary<string, byte>());
        subscribers[connectionId] = 0;

        _logger.LogInformation("Connection {ConnectionId} subscribed to {MatchId}.", connectionId, normalizedMatchId);
    }

    public void UnsubscribeFromMatch(string connectionId, string matchId)
    {
        RemoveSubscription(connectionId, NormalizeMatchId(matchId));
        _logger.LogInformation("Connection {ConnectionId} unsubscribed from {MatchId}.", connectionId, matchId);
    }

    public Task PublishToAllAsync<TPayload>(string eventType, TPayload data, CancellationToken cancellationToken = default)
    {
        var targets = _connections.Keys.ToArray();
        return PublishToConnectionsAsync(targets, eventType, null, data, cancellationToken);
    }

    public Task PublishToMatchAsync<TPayload>(string matchId, string eventType, TPayload data, CancellationToken cancellationToken = default)
    {
        var normalizedMatchId = NormalizeMatchId(matchId);

        if (!_matchSubscribers.TryGetValue(normalizedMatchId, out var subscribers))
        {
            return Task.CompletedTask;
        }

        var targets = subscribers.Keys.ToArray();
        return PublishToConnectionsAsync(targets, eventType, normalizedMatchId, data, cancellationToken);
    }

    public Task SendToConnectionAsync<TPayload>(string connectionId, string eventType, string? matchId, TPayload data, CancellationToken cancellationToken = default)
    {
        return PublishToConnectionsAsync([connectionId], eventType, matchId, data, cancellationToken);
    }

    private async Task PublishToConnectionsAsync<TPayload>(string[] connectionIds, string eventType, string? matchId, TPayload data, CancellationToken cancellationToken)
    {
        var envelope = new WebSocketMessageWrapper<TPayload>(
            EventType: eventType,
            Version: WebSocketMessageDefaults.CurrentVersion,
            SentAt: DateTimeOffset.UtcNow,
            Data: data,
            MatchId: matchId ?? WebSocketMessageDefaults.LobbyMatchId
        );

        var payload = JsonSerializer.SerializeToUtf8Bytes(envelope);
        var tasks = connectionIds.Select(connectionId => SendPayloadAsync(connectionId, payload, cancellationToken));
        await Task.WhenAll(tasks);
    }

    private async Task SendPayloadAsync(string connectionId, byte[] payload, CancellationToken cancellationToken)
    {
        if (!_connections.TryGetValue(connectionId, out var state))
        {
            return;
        }

        await state.SendLock.WaitAsync(cancellationToken);

        try
        {
            if (state.Socket.State != WebSocketState.Open)
            {
                await UnregisterConnectionAsync(connectionId, cancellationToken);
                return;
            }

            await state.Socket.SendAsync(payload, WebSocketMessageType.Text, true, cancellationToken);
        }
        catch (WebSocketException ex)
        {
            _logger.LogWarning(ex, "Failed sending payload to connection {ConnectionId}.", connectionId);
            await UnregisterConnectionAsync(connectionId, cancellationToken);
        }
        finally
        {
            state.SendLock.Release();
        }
    }

    private void RemoveSubscription(string connectionId, string matchId)
    {
        if (_connectionMatches.TryGetValue(connectionId, out var matchesForConnection))
        {
            matchesForConnection.TryRemove(matchId, out _);

            if (matchesForConnection.IsEmpty)
            {
                _connectionMatches.TryRemove(connectionId, out _);
            }
        }

        if (_matchSubscribers.TryGetValue(matchId, out var subscribers))
        {
            subscribers.TryRemove(connectionId, out _);

            if (subscribers.IsEmpty)
            {
                _matchSubscribers.TryRemove(matchId, out _);
            }
        }
    }

    private static string NormalizeMatchId(string matchId)
    {
        return string.IsNullOrWhiteSpace(matchId) ? WebSocketMessageDefaults.LobbyMatchId : matchId.Trim();
    }
}
