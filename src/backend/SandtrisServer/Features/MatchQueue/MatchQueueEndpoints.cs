namespace SandtrisServer.Features.MatchQueue;

public static class MatchQueueEndpoints
{
    public static void MapMatchQueueEndpoints(this WebApplication app)
    {
        app.MapPost("/match-queue/join", JoinMatchQueue.HandleAsync);
        app.MapPost("/match-queue/leave", LeaveMatchQueue.HandleAsync);
    }
}