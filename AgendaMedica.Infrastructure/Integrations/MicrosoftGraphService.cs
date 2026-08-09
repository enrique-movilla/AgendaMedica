// ============================================================
//  AGENDA MÉDICA — MICROSOFT GRAPH SERVICE
//  Proyecto : AgendaMedica.Infrastructure / Integrations
//  Archivo  : MicrosoftGraphService.cs
// ============================================================
//  Responsabilidades:
//  1. Crear eventos en el calendario del profesional (Teams)
//  2. Actualizar eventos cuando se reprograma una cita
//  3. Cancelar eventos cuando se cancela una cita
//  4. Crear y renovar suscripciones webhook para recibir
//     cambios desde Teams/Outlook
// ============================================================

using AgendaMedica.Domain.Interfaces;
using Azure.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Graph;
using Microsoft.Graph.Models;
using Microsoft.Graph.Models.ODataErrors;
using System.Text.Json;

namespace AgendaMedica.Infrastructure.Integrations;

// ── DTOs internos ─────────────────────────────────────────────
public record CrearEventoTeamsDto(
    int      CitaId,
    string   ProfesionalEmail,
    string   ProfesionalNombre,
    string   PacienteNombre,
    string   TipoCita,
    DateTime FechaHora,
    DateTime FechaHoraFin,
    string?  MotivoConsulta,
    bool     CrearReunionVirtual = false
);

public record EventoTeamsResultado(
    string  TeamsEventId,
    string? TeamsJoinUrl
);

// ── Interfaz pública ──────────────────────────────────────────
public interface IMicrosoftGraphService
{
    Task<EventoTeamsResultado> CrearEventoAsync(
        CrearEventoTeamsDto dto, CancellationToken ct = default);

    Task ActualizarEventoAsync(
        string teamsEventId, string profesionalEmail,
        DateTime nuevaFechaHora, DateTime nuevaFechaHoraFin,
        CancellationToken ct = default);

    Task CancelarEventoAsync(
        string teamsEventId, string profesionalEmail,
        string motivo, CancellationToken ct = default);

    Task<string> CrearSuscripcionWebhookAsync(
        string profesionalEmail, CancellationToken ct = default);

    Task<bool> RenovarSuscripcionWebhookAsync(
        string subscriptionId, CancellationToken ct = default);
}

// ── Implementación ────────────────────────────────────────────
public class MicrosoftGraphService : IMicrosoftGraphService
{
    private readonly GraphServiceClient _graph;
    private readonly IConfiguration     _config;
    private readonly ILogger<MicrosoftGraphService> _logger;

    public MicrosoftGraphService(
        IConfiguration config,
        ILogger<MicrosoftGraphService> logger)
    {
        _config = config;
        _logger = logger;

        var credential = new ClientSecretCredential(
            config["AzureAd:TenantId"],
            config["AzureAd:ClientId"],
            config["AzureAd:ClientSecret"]);

        _graph = new GraphServiceClient(credential,
            new[] { "https://graph.microsoft.com/.default" });
    }

    // ── 1. Crear evento ───────────────────────────────────────
    public async Task<EventoTeamsResultado> CrearEventoAsync(
        CrearEventoTeamsDto dto, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Creando evento Teams para cita {CitaId}", dto.CitaId);

        var evento = new Event
        {
            Subject = $"{dto.TipoCita} — {dto.PacienteNombre}",
            Body = new ItemBody
            {
                ContentType = BodyType.Html,
                Content     = ConstruirCuerpoEvento(dto)
            },
            Start = new DateTimeTimeZone
            {
                DateTime = dto.FechaHora.ToString("yyyy-MM-ddTHH:mm:ss"),
                TimeZone = "America/Bogota"
            },
            End = new DateTimeTimeZone
            {
                DateTime = dto.FechaHoraFin.ToString("yyyy-MM-ddTHH:mm:ss"),
                TimeZone = "America/Bogota"
            },
            ReminderMinutesBeforeStart = 30,
            IsReminderOn               = true,
            IsOnlineMeeting            = dto.CrearReunionVirtual,
            OnlineMeetingProvider      = dto.CrearReunionVirtual
                ? OnlineMeetingProviderType.TeamsForBusiness
                : OnlineMeetingProviderType.Unknown,
            ShowAs = FreeBusyStatus.Busy
        };

        try
        {
            var resultado = await _graph
                .Users[dto.ProfesionalEmail]
                .Calendar
                .Events
                .PostAsync(evento, cancellationToken: ct);

            _logger.LogInformation(
                "Evento Teams creado: {EventId} para cita {CitaId}",
                resultado?.Id, dto.CitaId);

            return new EventoTeamsResultado(
                resultado!.Id!,
                resultado.OnlineMeeting?.JoinUrl);
        }
        catch (ODataError ex)
        {
            _logger.LogError(ex,
                "Error Graph al crear evento para cita {CitaId}: {Msg}",
                dto.CitaId, ex.Error?.Message);
            throw new GraphIntegrationException(
                $"No se pudo crear el evento en Teams: {ex.Error?.Message}", ex);
        }
    }

    // ── 2. Actualizar evento ──────────────────────────────────
    public async Task ActualizarEventoAsync(
        string teamsEventId, string profesionalEmail,
        DateTime nuevaFechaHora, DateTime nuevaFechaHoraFin,
        CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Actualizando evento Teams {EventId}", teamsEventId);

        var update = new Event
        {
            Start = new DateTimeTimeZone
            {
                DateTime = nuevaFechaHora.ToString("yyyy-MM-ddTHH:mm:ss"),
                TimeZone = "America/Bogota"
            },
            End = new DateTimeTimeZone
            {
                DateTime = nuevaFechaHoraFin.ToString("yyyy-MM-ddTHH:mm:ss"),
                TimeZone = "America/Bogota"
            }
        };

        try
        {
            await _graph
                .Users[profesionalEmail]
                .Calendar
                .Events[teamsEventId]
                .PatchAsync(update, cancellationToken: ct);

            _logger.LogInformation(
                "Evento Teams {EventId} actualizado", teamsEventId);
        }
        catch (ODataError ex)
        {
            _logger.LogError(ex,
                "Error Graph al actualizar evento {EventId}: {Msg}",
                teamsEventId, ex.Error?.Message);
            throw new GraphIntegrationException(
                $"No se pudo actualizar el evento en Teams: {ex.Error?.Message}", ex);
        }
    }

    // ── 3. Cancelar evento ────────────────────────────────────
    public async Task CancelarEventoAsync(
        string teamsEventId, string profesionalEmail,
        string motivo, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Cancelando evento Teams {EventId}", teamsEventId);

        try
        {
            await _graph
                .Users[profesionalEmail]
                .Calendar
                .Events[teamsEventId]
                .Cancel
                .PostAsync(
                    new Microsoft.Graph.Users.Item.Calendar.Events.Item.Cancel
                        .CancelPostRequestBody { Comment = motivo },
                    cancellationToken: ct);

            _logger.LogInformation(
                "Evento Teams {EventId} cancelado", teamsEventId);
        }
        catch (ODataError ex)
        {
            _logger.LogError(ex,
                "Error Graph al cancelar evento {EventId}: {Msg}",
                teamsEventId, ex.Error?.Message);
            throw new GraphIntegrationException(
                $"No se pudo cancelar el evento en Teams: {ex.Error?.Message}", ex);
        }
    }

    // ── 4. Crear suscripción webhook ──────────────────────────
    public async Task<string> CrearSuscripcionWebhookAsync(
        string profesionalEmail, CancellationToken ct = default)
    {
        var expiracion = DateTimeOffset.UtcNow.AddMinutes(4230);

        var subscription = new Subscription
        {
            ChangeType         = "updated,deleted",
            NotificationUrl    = _config["Graph:WebhookNotifyUrl"],
            Resource           = $"/users/{profesionalEmail}/calendar/events",
            ExpirationDateTime = expiracion,
            ClientState        = _config["Graph:WebhookSecret"],
            LatestSupportedTlsVersion = "v1_2"
        };

        try
        {
            var result = await _graph.Subscriptions
                .PostAsync(subscription, cancellationToken: ct);

            _logger.LogInformation(
                "Suscripción webhook creada: {SubId}, expira: {Exp}",
                result?.Id, expiracion);

            return result!.Id!;
        }
        catch (ODataError ex)
        {
            _logger.LogError(ex,
                "Error al crear suscripción webhook: {Msg}", ex.Error?.Message);
            throw new GraphIntegrationException(
                $"No se pudo crear la suscripción webhook: {ex.Error?.Message}", ex);
        }
    }

    // ── 5. Renovar suscripción webhook ────────────────────────
    public async Task<bool> RenovarSuscripcionWebhookAsync(
        string subscriptionId, CancellationToken ct = default)
    {
        var nuevaExpiracion = DateTimeOffset.UtcNow.AddMinutes(4230);
        try
        {
            await _graph.Subscriptions[subscriptionId]
                .PatchAsync(new Subscription
                {
                    ExpirationDateTime = nuevaExpiracion
                }, cancellationToken: ct);

            _logger.LogInformation(
                "Suscripción {SubId} renovada hasta {Exp}",
                subscriptionId, nuevaExpiracion);
            return true;
        }
        catch (ODataError ex)
        {
            _logger.LogWarning(ex,
                "No se pudo renovar suscripción {SubId}: {Msg}",
                subscriptionId, ex.Error?.Message);
            return false;
        }
    }

    // ── Helper: cuerpo del evento ─────────────────────────────
    private static string ConstruirCuerpoEvento(CrearEventoTeamsDto dto) => $"""
        <html><body style="font-family:Segoe UI,Arial;color:#1a1a2e">
        <h3 style="color:#0C447C">Cita Médica — Agenda Médica</h3>
        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td><b>Paciente:</b></td><td>{dto.PacienteNombre}</td></tr>
          <tr><td><b>Tipo:</b></td><td>{dto.TipoCita}</td></tr>
          <tr><td><b>Fecha:</b></td>
              <td>{dto.FechaHora:dd/MM/yyyy HH:mm} – {dto.FechaHoraFin:HH:mm}</td></tr>
          {(dto.MotivoConsulta is not null
              ? $"<tr><td><b>Motivo:</b></td><td>{dto.MotivoConsulta}</td></tr>"
              : "")}
        </table>
        <p style="color:#6B7280;font-size:12px;margin-top:16px">
          Generado por el sistema de Agenda Médica.<br/>
          No responda este correo.
        </p>
        </body></html>
        """;
}

// ── Excepción de integración ──────────────────────────────────
public class GraphIntegrationException : Exception
{
    public GraphIntegrationException(string message, Exception inner)
        : base(message, inner) { }
}
