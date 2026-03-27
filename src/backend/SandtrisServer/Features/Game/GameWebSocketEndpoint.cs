using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using SandtrisServer.Features.Game.Model;

namespace SandtrisServer.Features.Game;

public static class GameWebSocketEndpoint
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static IEndpointRouteBuilder MapGameEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/ws", HandleAsync);
        return app;
    }

    public static async Task HandleAsync(HttpContext context, WebSocketEventBus eventBus, GameService gameService, ILoggerFactory loggerFactory, CancellationToken cancellationToken)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsync("Expected a WebSocket upgrade request.", cancellationToken);
            return;
        }

        using var socket = await context.WebSockets.AcceptWebSocketAsync();
        var logger = loggerFactory.CreateLogger("GameWebSocketEndpoint");
        var applicationLifetime = context.RequestServices.GetRequiredService<IHostApplicationLifetime>();
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken,
            context.RequestAborted,
            applicationLifetime.ApplicationStopping);
        var shutdownToken = linkedCts.Token;

        var connectionId = eventBus.RegisterConnection(socket);

        try
        {
            await ReceiveLoopAsync(connectionId, socket, eventBus, gameService, shutdownToken);
        }
        catch (OperationCanceledException ex) when (shutdownToken.IsCancellationRequested)
        {
            logger.LogDebug(ex, "Connection {ConnectionId} receive loop cancelled due to shutdown/disconnect.", connectionId);
        }
        finally
        {
            await eventBus.UnregisterConnectionAsync(connectionId, CancellationToken.None);
        }
    }

    private static async Task ReceiveLoopAsync(
        string connectionId,
        WebSocket socket,
        WebSocketEventBus eventBus,
        GameService gameService,
        CancellationToken cancellationToken)
    {
        var buffer = new byte[4096];

        while (socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
        {
            var payload = await ReceiveTextMessageAsync(socket, buffer, cancellationToken);

            if (payload is null)
            {
                break;
            }

            if (string.IsNullOrWhiteSpace(payload))
            {
                continue;
            }

            if (!TryGetEventType(payload, out var eventType))
            {
                continue;
            }

            if (await HandleControlEventAsync(connectionId, payload, eventType, eventBus, cancellationToken))
            {
                continue;
            }

            await HandleGameEventAsync(connectionId, payload, eventType, gameService, cancellationToken);
        }
    }

    private static async Task<bool> HandleControlEventAsync(
        string connectionId,
        string payload,
        string eventType,
        WebSocketEventBus eventBus,
        CancellationToken cancellationToken)
    {
        if (eventType == EventTypes.SubscribeToMatchEvent.EventTypeName)
        {
            if (!TryDeserialize<WebSocketMessageWrapper<EventTypes.SubscribeToMatchEvent>>(payload, out var message) || message is null)
            {
                await eventBus.SendToConnectionAsync(
                    connectionId,
                    new EventTypes.ErrorEvent(string.Empty, "Invalid subscribe-to-match event payload."),
                    cancellationToken);
                return true;
            }

            var matchId = message.Event.MatchId?.Trim();
            if (string.IsNullOrWhiteSpace(matchId))
            {
                await eventBus.SendToConnectionAsync(
                    connectionId,
                    new EventTypes.ErrorEvent(string.Empty, "matchId is required for subscribe-to-match."),
                    cancellationToken);
                return true;
            }

            eventBus.SubscribeToMatch(connectionId, matchId);
            await eventBus.SendToConnectionAsync(
                connectionId,
                new EventTypes.MatchSubscribedEvent(matchId, connectionId),
                cancellationToken);
            return true;
        }

        if (eventType == EventTypes.UnsubscribeFromMatchEvent.EventTypeName)
        {
            if (!TryDeserialize<WebSocketMessageWrapper<EventTypes.UnsubscribeFromMatchEvent>>(payload, out var message) || message is null)
            {
                await eventBus.SendToConnectionAsync(
                    connectionId,
                    new EventTypes.ErrorEvent(string.Empty, "Invalid unsubscribe-from-match event payload."),
                    cancellationToken);
                return true;
            }

            var matchId = message.Event.MatchId?.Trim();
            if (string.IsNullOrWhiteSpace(matchId))
            {
                await eventBus.SendToConnectionAsync(
                    connectionId,
                    new EventTypes.ErrorEvent(string.Empty, "matchId is required for unsubscribe-from-match."),
                    cancellationToken);
                return true;
            }

            eventBus.UnsubscribeFromMatch(connectionId, matchId);
            await eventBus.SendToConnectionAsync(
                connectionId,
                new EventTypes.MatchUnsubscribedEvent(matchId, connectionId),
                cancellationToken);
            return true;
        }

        if (eventType == EventTypes.PingEvent.EventTypeName)
        {
            await eventBus.SendToConnectionAsync(
                connectionId,
                new EventTypes.PongEvent("pong"),
                cancellationToken);
            return true;
        }

        return false;
    }

    private static async Task HandleGameEventAsync(
        string connectionId,
        string payload,
        string eventType,
        GameService gameService,
        CancellationToken cancellationToken)
    {
        if (eventType == EventTypes.MatchStartedEvent.EventTypeName)
        {
            if (TryDeserialize<WebSocketMessageWrapper<EventTypes.MatchStartedEvent>>(payload, out var startedMessage) && startedMessage is not null)
            {
                await gameService.HandleClientMatchStartedAsync(connectionId, startedMessage.Event.MatchId, startedMessage.Event, cancellationToken);
            }

            return;
        }

        if (eventType == EventTypes.MatchEndedEvent.EventTypeName)
        {
            if (TryDeserialize<WebSocketMessageWrapper<EventTypes.MatchEndedEvent>>(payload, out var endedMessage) && endedMessage is not null)
            {
                await gameService.HandleClientMatchEndedAsync(connectionId, endedMessage.Event.MatchId, endedMessage.Event, cancellationToken);
            }

            return;
        }
    }

    private static bool TryGetEventType(string payload, out string eventType)
    {
        eventType = string.Empty;

        try
        {
            using var document = JsonDocument.Parse(payload);
            if (!document.RootElement.TryGetProperty("event", out var eventNode) || eventNode.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            if (!eventNode.TryGetProperty("eventType", out var typeNode) || typeNode.ValueKind != JsonValueKind.String)
            {
                return false;
            }

            eventType = typeNode.GetString()?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(eventType))
            {
                return false;
            }

            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool TryDeserialize<T>(string payload, out T? result)
    {
        try
        {
            result = JsonSerializer.Deserialize<T>(payload, JsonOptions);
            return result is not null;
        }
        catch (JsonException)
        {
            result = default;
            return false;
        }
    }

    private static async Task<string?> ReceiveTextMessageAsync(WebSocket socket, byte[] buffer, CancellationToken cancellationToken)
    {
        using var ms = new MemoryStream();

        while (true)
        {
            var result = await socket.ReceiveAsync(buffer, cancellationToken);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                return null;
            }

            if (result.MessageType != WebSocketMessageType.Text)
            {
                if (result.EndOfMessage)
                {
                    return string.Empty;
                }

                continue;
            }

            await ms.WriteAsync(buffer.AsMemory(0, result.Count), cancellationToken);

            if (result.EndOfMessage)
            {
                return Encoding.UTF8.GetString(ms.ToArray());
            }
        }
    }
}
