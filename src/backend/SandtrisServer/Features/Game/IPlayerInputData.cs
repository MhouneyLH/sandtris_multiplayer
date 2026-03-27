namespace SandtrisServer.Features.Game;

public interface IPlayerInputData
{
    public static abstract string DataTypeName { get; }
}

public sealed record MoveInputData(int DeltaX, int DeltaY) : IPlayerInputData
{
    public static string DataTypeName => "move";
}

public sealed record RotateInputData(bool Clockwise) : IPlayerInputData
{
    public static string DataTypeName => "rotate";
}

public sealed record DropInputData : IPlayerInputData
{
    public static string DataTypeName => "drop";
}
