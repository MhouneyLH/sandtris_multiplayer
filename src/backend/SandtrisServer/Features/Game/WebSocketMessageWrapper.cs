using System.ComponentModel.DataAnnotations;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace SandtrisServer.Features.Game;

public static class WebSocketMessageDefaults
{
    public const int CurrentVersion = 1;
    public const string LobbyMatchId = "lobby";
}

public sealed record WebSocketMessageWrapper<TPayload>(
    [property: JsonPropertyName("eventType"), Required] string EventType,
    [property: JsonPropertyName("sentAt"), Required] DateTimeOffset SentAt,
    [property: JsonPropertyName("data"), Required] TPayload Data,
    [property: JsonPropertyName("version"), Required] int Version = WebSocketMessageDefaults.CurrentVersion,
    [property: JsonPropertyName("matchId"), Required] string MatchId = WebSocketMessageDefaults.LobbyMatchId // use lobby for non-match-specific events
);

public sealed record MatchStartedPayload(string MatchId, string[] PlayerIds);
public sealed record MatchEndedPayload(string MatchId, string WinnerPlayerId);
public sealed record GameUpdatePayload(string MatchId, int Tick, object StateDelta);
public sealed record QueueUpdatedPayload(int QueueSize, string PlayerId, QueueUpdateAction Action);

public enum QueueUpdateAction
{
    [EnumMember(Value = "joined")]
    Joined,
    [EnumMember(Value = "left")]
    Left
}

public sealed record SubscriptionStatePayload(string MatchId);
public sealed record PongPayload(string Message);
public sealed record ErrorPayload(string MatchId, string ErrorMessage);

public sealed record ClientControlMessage(string? Action, string? MatchId);
public sealed record ClientEventEnvelope(string? EventType, string? MatchId);
public sealed record ClientMatchStartedMessage(string EventType, string? MatchId, MatchStartedPayload Data);
public sealed record ClientMatchEndedMessage(string EventType, string? MatchId, MatchEndedPayload Data);
public sealed record ClientGameUpdateMessage(string EventType, string? MatchId, GameUpdatePayload Data);
public sealed record ClientGenericGameEvent(string EventType, string? MatchId, Dictionary<string, object?> Data);