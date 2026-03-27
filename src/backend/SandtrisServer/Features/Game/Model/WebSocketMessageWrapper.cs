using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SandtrisServer.Features.Game.Model;

public static class WebSocketMessageDefaults
{
    public const int CurrentVersion = 1;
}

public sealed record WebSocketMessageWrapper<TEvent>(
    [property: JsonPropertyName("sentAt"), Required] DateTimeOffset SentAt,
    [property: JsonPropertyName("event"), Required] TEvent Event,
    [property: JsonPropertyName("version"), Required] int Version = WebSocketMessageDefaults.CurrentVersion
);