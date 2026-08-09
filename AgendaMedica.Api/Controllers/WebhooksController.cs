// ============================================================
//  AGENDA MÉDICA — WEBHOOKS CONTROLLER (corregido)
//  Proyecto : AgendaMedica.Api / Controllers
// ============================================================

using AgendaMedica.Application.Commands;
using AgendaMedica.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;   // ← fix AllowAnonymous
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;

namespace AgendaMedica.Api.Controllers;

[ApiController]
[Route("v1/[controller]")]
public class WebhooksController : ControllerBase
{
    private readonly IMediator      _mediator;
    private readonly IConfiguration _config;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(
        IMediator mediator,
        IConfiguration config,
        ILogger<WebhooksController> logger)
    {
        _mediator = mediator;
        _config   = config;
        _logger   = logger;
    }

    [HttpPost("teams")]
    [AllowAnonymous]
    public async Task<IActionResult> RecibirNotificacionTeams(
        [FromQuery] string? validationToken,
        [FromBody]  GraphNotificationPayload? payload,
        CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(validationToken))
        {
            _logger.LogInformation("Graph webhook handshake recibido.");
            return Content(validationToken, "text/plain");
        }

        if (payload?.Value is null || !payload.Value.Any())
            return Ok();

        var secretEsperado = _config["Graph:WebhookSecret"] ?? string.Empty;

        foreach (var notif in payload.Value)
        {
            if (notif.ClientState != secretEsperado)
            {
                _logger.LogWarning("Webhook Teams con clientState inválido.");
                return Unauthorized();
            }

            var teamsEventId = notif.ResourceData?.Id;
            if (string.IsNullOrWhiteSpace(teamsEventId)) continue;

            _logger.LogInformation(
                "Notificación Teams: tipo={Tipo} eventId={EventId}",
                notif.ChangeType, teamsEventId);

            await _mediator.Send(
                new ProcesarCambioTeamsCommand(
                    teamsEventId, notif.ChangeType ?? "updated"), ct);
        }

        return Accepted();
    }
}

public record GraphNotificationPayload(
    [property: JsonPropertyName("value")]
    List<GraphNotificationItem>? Value);

public record GraphNotificationItem(
    [property: JsonPropertyName("subscriptionId")]  string? SubscriptionId,
    [property: JsonPropertyName("changeType")]      string? ChangeType,
    [property: JsonPropertyName("clientState")]     string? ClientState,
    [property: JsonPropertyName("resourceData")]    GraphResourceData? ResourceData);

public record GraphResourceData(
    [property: JsonPropertyName("id")]              string? Id,
    [property: JsonPropertyName("@odata.type")]     string? OdataType);
