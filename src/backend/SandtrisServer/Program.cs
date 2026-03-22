using SandtrisServer.Features.Game;
using SandtrisServer.Features.MatchQueue;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors();

builder.Services.AddSingleton<WebSocketEventBus>();
builder.Services.AddSingleton<GameService>();
builder.Services.AddSingleton<MatchQueueService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

var webSocketOptions = new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromMinutes(5)
};

app.UseWebSockets(webSocketOptions);

app.MapGameEndpoints();
app.MapMatchQueueEndpoints();


await app.RunAsync();