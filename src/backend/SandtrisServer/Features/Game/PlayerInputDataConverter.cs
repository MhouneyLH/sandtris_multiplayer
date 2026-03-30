using System.Text.Json;
using System.Text.Json.Serialization;

namespace SandtrisServer.Features.Game;

public sealed class PlayerInputDataConverter : JsonConverter<IPlayerInputData>
{
    public override IPlayerInputData? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var doc = JsonDocument.ParseValue(ref reader);
        var root = doc.RootElement;

        if (!root.TryGetProperty("dataTypeName", out var dataTypeProperty))
        {
            throw new JsonException("Missing dataTypeName property");
        }

        var dataTypeName = dataTypeProperty.GetString();

        return dataTypeName switch
        {
            "move" => root.Deserialize<MoveInputData>(options),
            "rotate" => root.Deserialize<RotateInputData>(options),
            "drop" => root.Deserialize<DropInputData>(options),
            _ => throw new JsonException($"Unknown dataTypeName: {dataTypeName}")
        };
    }

    public override void Write(Utf8JsonWriter writer, IPlayerInputData value, JsonSerializerOptions options)
    {
        switch (value)
        {
            case MoveInputData move:
                JsonSerializer.Serialize(writer, move, options);
                break;
            case RotateInputData rotate:
                JsonSerializer.Serialize(writer, rotate, options);
                break;
            case DropInputData drop:
                JsonSerializer.Serialize(writer, drop, options);
                break;
            default:
                throw new JsonException($"Unknown IPlayerInputData type: {value.GetType().Name}");
        }
    }
}
