namespace SandtrisServer.Features.MatchQueue;

public static class GetQueueSize
{
    public sealed record Response(int QueueSize);

    public static IResult HandleAsync(MatchQueueService matchQueueService)
    {
        var queueSize = matchQueueService.GetQueueSize();
        return Results.Ok(new Response(queueSize));
    }
}
