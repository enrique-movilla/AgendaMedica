# Etapa de compilación
FROM ://microsoft.com AS build
WORKDIR /src

# Copiar archivos de proyecto (.csproj) para restaurar dependencias
COPY ["AgendaMedica.Api/AgendaMedica.Api.csproj", "AgendaMedica.Api/"]
COPY ["AgendaMedica.Application/AgendaMedica.Application.csproj", "AgendaMedica.Application/"]
COPY ["AgendaMedica.Domain/AgendaMedica.Domain.csproj", "AgendaMedica.Domain/"]
COPY ["AgendaMedica.Infrastructure/AgendaMedica.Infrastructure.csproj", "AgendaMedica.Infrastructure/"]

# Restaurar dependencias
RUN dotnet restore "AgendaMedica.Api/AgendaMedica.Api.csproj"

# Copiar todo el código restante y compilar
COPY . .
WORKDIR "/src/AgendaMedica.Api"
RUN dotnet publish "AgendaMedica.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Etapa de ejecución final
FROM ://microsoft.com AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "AgendaMedica.Api.dll"]
