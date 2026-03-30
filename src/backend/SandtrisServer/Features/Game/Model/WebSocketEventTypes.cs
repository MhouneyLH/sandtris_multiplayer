using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SandtrisServer.Features.Game.Model;

public static class EventTypes
{
    public sealed record MatchStartedEvent(
        [property: JsonPropertyName("matchId"), Required] string MatchId,
        [property: JsonPropertyName("playerIds"), Required] string[] PlayerIds) : IEvent
    {
        public static string EventTypeName => "match-started";

        [JsonPropertyName("eventType"), Required]
        public string EventType => EventTypeName;
    }

    public sealed record MatchEndedEvent(
        [property: JsonPropertyName("matchId"), Required] string MatchId,
        [property: JsonPropertyName("winnerPlayerId"), Required] string WinnerPlayerId) : IEvent
    {
        public static string EventTypeName => "match-ended";

        [JsonPropertyName("eventType"), Required]
        public string EventType => EventTypeName;
    }

    public sealed record QueueUpdatedEvent(
        [property: JsonPropertyName("queueSize"), Required] int QueueSize,
        [property: JsonPropertyName("playerId"), Required] string PlayerId,
        [property: JsonPropertyName("action"), Required] QueueUpdateAction Action) : IEvent
    {
        public static string EventTypeName => "queue-updated";

        [JsonPropertyName("eventType"), Required]
        public string EventType => EventTypeName;
    }

    public sealed record SubscribeToMatchEvent(
        [property: JsonPropertyName("matchId"), Required] string MatchId,
        [property: JsonPropertyName("playerId"), Required] string PlayerId) : IEvent
    {
        public static string EventTypeName => "subscribe-to-match";

        [JsonPropertyName("eventType"), Required]
        public string EventType => EventTypeName;
    }

    public sealed record UnsubscribeFromMatchEvent(
        [property: JsonPropertyName("matchId"), Required] string MatchId,
        [property: JsonPropertyName("playerId"), Required] string PlayerId) : IEvent
    {
        public static string EventTypeName => "unsubscribe-from-match";

        [JsonPropertyName("eventType"), Required]
        public string EventType => EventTypeName;
    }

    public sealed record MatchSubscribedEvent(
        [property: JsonPropertyName("matchId"), Required] string MatchId,
        [property: JsonPropertyName("playerId"), Required] string PlayerId) : IEvent
    {
        public static string EventTypeName => "match-subscribed";

        [JsonPropertyName("eventType"), Required]
        public string EventType => EventTypeName;
    }

    public sealed record MatchUnsubscribedEvent(
        [property: JsonPropertyName("matchId"), Required] string MatchId,
        [property: JsonPropertyName("playerId"), Required] string PlayerId) : IEvent
    {
        public static string EventTypeName => "match-unsubscribed";

        [JsonPropertyName("eventType"), Required]
        public string EventType => EventTypeName;
    }

    public sealed record PlayerInputEvent(
        [property: JsonPropertyName("matchId"), Required] string MatchId,
        [property: JsonPropertyName("playerId"), Required] string PlayerId,
        [property: JsonPropertyName("playerInputData"), JsonConverter(typeof(PlayerInputDataConverter)), Required]
        IPlayerInputData PlayerInputData) : IEvent
    {
        public static string EventTypeName => "player-input";

        [JsonPropertyName("eventType"), Required]
        public string EventType => EventTypeName;
    }

    public sealed record PieceSpawnedEvent(
        [property: JsonPropertyName("matchId"), Required] string MatchId,
        [property: JsonPropertyName("playerId"), Required] string PlayerId,
        [property: JsonPropertyName("shape")] int[][]? Shape,
        [property: JsonPropertyName("color")] string? Color) : IEvent
    {
        public static string EventTypeName => "piece-spawned";

        [JsonPropertyName("eventType"), Required]
        public string EventType => EventTypeName;
    }

    public sealed record PingEvent : IEvent
    {
        public static string EventTypeName => "ping";

        [JsonPropertyName("eventType"), Required]
        public string EventType => EventTypeName;
    }

    public sealed record PongEvent(
        [property: JsonPropertyName("message"), Required] string Message) : IEvent
    {
        public static string EventTypeName => "pong";

        [JsonPropertyName("eventType"), Required]
        public string EventType => EventTypeName;
    }

    public sealed record ErrorEvent(
        [property: JsonPropertyName("matchId"), Required] string MatchId,
        [property: JsonPropertyName("errorMessage"), Required] string ErrorMessage) : IEvent
    {
        public static string EventTypeName => "error";

        [JsonPropertyName("eventType"), Required]
        public string EventType => EventTypeName;
    }
}