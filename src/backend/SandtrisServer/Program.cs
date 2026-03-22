using SandtrisServer.Features.MatchQueue;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddSingleton<MatchQueueService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapMatchQueueEndpoints();

await app.RunAsync();