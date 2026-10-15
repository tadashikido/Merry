FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /origem
COPY Directory.Build.props Directory.Packages.props Casamento.sln ./
COPY src/Casamento.Dominio/Casamento.Dominio.csproj src/Casamento.Dominio/
COPY src/Casamento.Aplicacao/Casamento.Aplicacao.csproj src/Casamento.Aplicacao/
COPY src/Casamento.Infraestrutura/Casamento.Infraestrutura.csproj src/Casamento.Infraestrutura/
COPY src/Casamento.Api/Casamento.Api.csproj src/Casamento.Api/
RUN dotnet restore src/Casamento.Api/Casamento.Api.csproj
COPY src/ src/
RUN dotnet publish src/Casamento.Api/Casamento.Api.csproj -c Release -o /publicacao --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
COPY --from=build /publicacao .
RUN mkdir -p /var/lib/nossia/arquivos && chown $APP_UID /var/lib/nossia/arquivos && chmod 700 /var/lib/nossia/arquivos
USER $APP_UID
ENTRYPOINT ["dotnet", "Casamento.Api.dll"]
