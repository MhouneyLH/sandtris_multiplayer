using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SandtrisServer.Features.Game.Model;

/// <summary>
/// Base interface for all game-related events sent from the server to clients or from the client to the server.
/// </summary>
public interface IEvent
{
    [JsonPropertyName("eventType"), Required]
    public static abstract string EventTypeName { get; }
}