using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

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
            await ReceiveLoopAsync(connectionId, socket, eventBus, gameService, logger, shutdownToken);
        }
        catch (OperationCanceledException) when (shutdownToken.IsCancellationRequested)
        {
            logger.LogDebug("Connection {ConnectionId} receive loop cancelled due to shutdown/disconnect.", connectionId);
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
        ILogger logger,
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

            if (TryDeserialize<ClientControlMessage>(payload, out var command) && !string.IsNullOrWhiteSpace(command?.Action))
            {
                var action = command.Action.Trim().ToLowerInvariant();
                var matchId = string.IsNullOrWhiteSpace(command.MatchId) ? WebSocketMessageDefaults.LobbyMatchId : command.MatchId.Trim();

                switch (action)
                {
                    case "subscribe":
                        eventBus.SubscribeToMatch(connectionId, matchId);
                        await eventBus.SendToConnectionAsync(
                            connectionId,
                            WebSocketEventTypes.Subscribed,
                            matchId,
                            new SubscriptionStatePayload(matchId),
                            cancellationToken);
                        break;

                    case "unsubscribe":
                        eventBus.UnsubscribeFromMatch(connectionId, matchId);
                        await eventBus.SendToConnectionAsync(
                            connectionId,
                            WebSocketEventTypes.Unsubscribed,
                            matchId,
                            new SubscriptionStatePayload(matchId),
                            cancellationToken);
                        break;

                    case "ping":
                        await eventBus.SendToConnectionAsync(
                            connectionId,
                            WebSocketEventTypes.Pong,
                            null,
                            new PongPayload("pong"),
                            cancellationToken);
                        break;

                    default:
                        logger.LogWarning("Unknown control action {Action} from connection {ConnectionId}.", action, connectionId);
                        break;
                }

                continue;
            }

            if (!TryDeserialize<ClientEventEnvelope>(payload, out var envelope) || string.IsNullOrWhiteSpace(envelope?.EventType))
            {
                continue;
            }

            var eventType = envelope.EventType.Trim();

            switch (eventType)
            {
                case WebSocketEventTypes.MatchStarted:
                    if (TryDeserialize<ClientMatchStartedMessage>(payload, out var startedMessage) && startedMessage is not null)
                    {
                        await gameService.HandleClientMatchStartedAsync(connectionId, startedMessage.MatchId, startedMessage.Data, cancellationToken);
                    }
                    break;

                case WebSocketEventTypes.MatchEnded:
                    if (TryDeserialize<ClientMatchEndedMessage>(payload, out var endedMessage) && endedMessage is not null)
                    {
                        await gameService.HandleClientMatchEndedAsync(connectionId, endedMessage.MatchId, endedMessage.Data, cancellationToken);
                    }
                    break;

                case WebSocketEventTypes.GameUpdate:
                    if (TryDeserialize<ClientGameUpdateMessage>(payload, out var updateMessage) && updateMessage is not null)
                    {
                        await gameService.HandleClientGameUpdateAsync(connectionId, updateMessage.MatchId, updateMessage.Data, cancellationToken);
                    }
                    break;

                default:
                    if (TryDeserialize<ClientGenericGameEvent>(payload, out var genericMessage) && genericMessage is not null)
                    {
                        await gameService.HandleClientEventAsync(
                            connectionId,
                            genericMessage.EventType,
                            genericMessage.MatchId,
                            genericMessage.Data,
                            cancellationToken);
                    }
                    break;
            }
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

            ms.Write(buffer, 0, result.Count);

            if (result.EndOfMessage)
            {
                return Encoding.UTF8.GetString(ms.ToArray());
            }
        }
    }
}
