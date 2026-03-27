using System.Runtime.Serialization;

namespace SandtrisServer.Features.Game.Model;

public enum QueueUpdateAction
{
    [EnumMember(Value = "joined")]
    Joined,
    [EnumMember(Value = "left")]
    Left
}