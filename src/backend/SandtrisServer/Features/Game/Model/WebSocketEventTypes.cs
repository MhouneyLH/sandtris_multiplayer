namespace SandtrisServer.Features.Game.Model;

public static class EventTypes
{
    /// <summary>
    /// Indicates the start of a match. Payload includes the match ID and participating player IDs.
    /// </summary>
    public sealed record MatchStartedEvent(string MatchId, string[] PlayerIds) : IEvent
    {
        public static string EventTypeName => "match-started";
    }

    /// <summary>
    /// Indicates the end of a match. Payload includes the match ID and winner player ID.
    /// </summary>
    public sealed record MatchEndedEvent(string MatchId, string WinnerPlayerId) : IEvent
    {
        public static string EventTypeName => "match-ended";
    }

    /// <summary>
    /// Indicates an update to the match queue, such as a player joining or leaving. The payload should include the current queue size and any relevant player information.
    /// </summary>
    public sealed record QueueUpdatedEvent(int QueueSize, string PlayerId, QueueUpdateAction Action) : IEvent
    {
        public static string EventTypeName => "queue-updated";
    }

    /// <summary>
    /// Client command requesting subscription to a match event stream.
    /// </summary>
    public sealed record SubscribeToMatchEvent(string MatchId, string PlayerId) : IEvent
    {
        public static string EventTypeName => "subscribe-to-match";
    }

    /// <summary>
    /// Client command requesting unsubscription from a match event stream.
    /// </summary>
    public sealed record UnsubscribeFromMatchEvent(string MatchId, string PlayerId) : IEvent
    {
        public static string EventTypeName => "unsubscribe-from-match";
    }

    /// <summary>
    /// Broadcast indicating a connection/player has subscribed to a match.
    /// </summary>
    public sealed record MatchSubscribedEvent(string MatchId, string PlayerId) : IEvent
    {
        public static string EventTypeName => "match-subscribed";
    }

    /// <summary>
    /// Broadcast indicating a connection/player has unsubscribed from a match.
    /// </summary>
    public sealed record MatchUnsubscribedEvent(string MatchId, string PlayerId) : IEvent
    {
        public static string EventTypeName => "match-unsubscribed";
    }

    /// <summary>
    /// Opponent streaming event containing an input action for a player in a match.
    /// </summary>
    public sealed record PlayerInputEvent(string MatchId, string PlayerId, IPlayerInputData PlayerInputData) : IEvent
    {
        public static string EventTypeName => "player-input";
    }

    public sealed record PieceSpawnedEvent(string MatchId, string PlayerId) : IEvent
    {
        public static string EventTypeName => "piece-spawned";
    }

    public sealed record PingEvent : IEvent
    {
        public static string EventTypeName => "ping";
    }

    public sealed record PongEvent(string Message) : IEvent
    {
        public static string EventTypeName => "pong";
    }

    public sealed record ErrorEvent(string MatchId, string ErrorMessage) : IEvent
    {
        public static string EventTypeName => "error";
    }
}