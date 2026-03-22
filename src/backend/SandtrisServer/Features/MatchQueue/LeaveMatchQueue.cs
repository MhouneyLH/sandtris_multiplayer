using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SandtrisServer.Features.MatchQueue;

public static class LeaveMatchQueue
{
    public sealed record Request([property: JsonPropertyName("playerId"), Required] string PlayerId);

    public static async Task<IResult> HandleAsync(Request request, MatchQueueService matchQueueService)
    {
        await matchQueueService.LeaveQueueAsync(request.PlayerId);
        return Results.Ok();
    }
}