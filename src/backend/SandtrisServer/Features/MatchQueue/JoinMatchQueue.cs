using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SandtrisServer.Features.MatchQueue;

public static class JoinMatchQueue
{
    public sealed record Request([property: JsonPropertyName("playerId"), Required] Guid PlayerId);

    public sealed record Response([property: JsonPropertyName("queueSize")] int QueueSize);

    public static async Task<IResult> HandleAsync(Request request, MatchQueueService matchQueueService)
    {
        try
        {
            await matchQueueService.JoinQueueAsync(request.PlayerId);
            var queueSize = matchQueueService.GetQueueSize();
            return Results.Ok(new Response(queueSize));
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { Message = ex.Message });
        }
    }
}