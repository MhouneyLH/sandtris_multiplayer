FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY *.sln ./
COPY *.csproj ./
RUN dotnet restore

COPY . .

RUN dotnet publish SandtrisServer.csproj \
    -c Release \
    -o /app/publish \
    /p:PublishReadyToRun=true \
    /p:InvariantGlobalization=true

    
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app

COPY --from=build /app/publish .

USER app

ENV ASPNETCORE_URLS=http://+:5015 \
    ASPNETCORE_ENVIRONMENT=Development \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=true

EXPOSE 5015

ENTRYPOINT ["dotnet", "SandtrisServer.dll"]