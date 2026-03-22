namespace SandtrisServer.Features.Game;

public static class WebSocketEventTypes
{    public const string MatchStarted = "match-started";
    public const string MatchEnded = "match-ended";
    public const string GameUpdate = "game-update";
    public const string QueueUpdated = "queue-updated";
    public const string Subscribed = "subscribed";
    public const string Unsubscribed = "unsubscribed";
    public const string Pong = "pong";
    public const string Error = "error";
}