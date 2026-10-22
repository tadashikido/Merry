FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /origem
COPY Directory.Build.props Directory.Packages.props Celebri.sln ./
COPY src/Celebri.Dominio/Celebri.Dominio.csproj src/Celebri.Dominio/
COPY src/Celebri.Aplicacao/Celebri.Aplicacao.csproj src/Celebri.Aplicacao/
COPY src/Celebri.Infraestrutura/Celebri.Infraestrutura.csproj src/Celebri.Infraestrutura/
COPY src/Celebri.Api/Celebri.Api.csproj src/Celebri.Api/
RUN dotnet restore src/Celebri.Api/Celebri.Api.csproj
COPY src/ src/
RUN dotnet publish src/Celebri.Api/Celebri.Api.csproj -c Release -o /publicacao --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
COPY --from=build /publicacao .
RUN mkdir -p /var/lib/celebri/arquivos && chown $APP_UID /var/lib/celebri/arquivos && chmod 700 /var/lib/celebri/arquivos
USER $APP_UID
ENTRYPOINT ["dotnet", "Celebri.Api.dll"]
