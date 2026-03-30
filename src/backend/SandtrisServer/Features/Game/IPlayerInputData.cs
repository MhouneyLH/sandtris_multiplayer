using System.Text.Json.Serialization;

namespace SandtrisServer.Features.Game;

public interface IPlayerInputData
{
}

public sealed record MoveInputData(
    [property: JsonPropertyName("deltaX")] int DeltaX,
    [property: JsonPropertyName("deltaY")] int DeltaY) : IPlayerInputData
{
    [JsonPropertyName("dataTypeName")]
    public string DataTypeName => "move";
}

public sealed record RotateInputData(
    [property: JsonPropertyName("clockwise")] bool Clockwise) : IPlayerInputData
{
    [JsonPropertyName("dataTypeName")]
    public string DataTypeName => "rotate";
}

public sealed record DropInputData : IPlayerInputData
{
    [JsonPropertyName("dataTypeName")]
    public string DataTypeName => "drop";
}
