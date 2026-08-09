// ============================================================
//  AGENDA MÉDICA — SERVICIO DE NOTIFICACIONES (v1.3 corregido)
//  Proyecto : AgendaMedica.Infrastructure / Notifications
// ============================================================
//  Implementa INotificacionService definida en Domain.
// ============================================================

using AgendaMedica.Domain.Entities;
using AgendaMedica.Domain.Interfaces;   // ← interfaz ahora en Domain
using AgendaMedica.Infrastructure.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Text.Json;

namespace AgendaMedica.Infrastructure.Notifications;

public class NotificacionService : INotificacionService
{
    private readonly IConfiguration _config;
    private readonly AgendaDbContext _db;
    private readonly ILogger<NotificacionService> _logger;

    public NotificacionService(
        IConfiguration config,
        AgendaDbContext db,
        ILogger<NotificacionService> logger)
    {
        _config = config;
        _db     = db;
        _logger = logger;
    }

    public async Task NotificarCreacionCitaAsync(Cita cita, CancellationToken ct = default)
    {
        var asunto  = $"Cita programada — {cita.TipoCita?.Nombre}";
        var mensaje = $"Estimado/a {cita.Paciente?.NombresCompletos}, su cita de " +
                      $"{cita.TipoCita?.Nombre} ha sido programada para el " +
                      $"{cita.FechaHora:dd/MM/yyyy} a las {cita.FechaHora:HH:mm}. " +
                      $"Profesional: {cita.Profesional?.NombresCompletos}. " +
                      $"Por favor llegar 10 minutos antes.";
        await EnviarATodosLosCanalesAsync(cita, asunto, mensaje, "Confirmacion", ct);
    }

    public async Task NotificarConfirmacionCitaAsync(Cita cita, CancellationToken ct = default)
    {
        var asunto  = $"Cita confirmada — {cita.FechaHora:dd/MM/yyyy HH:mm}";
        var mensaje = $"Su cita del {cita.FechaHora:dd/MM/yyyy} a las {cita.FechaHora:HH:mm} " +
                      $"con {cita.Profesional?.NombresCompletos} ha sido CONFIRMADA.";
        await EnviarATodosLosCanalesAsync(cita, asunto, mensaje, "Confirmacion", ct);
    }

    public async Task NotificarCancelacionCitaAsync(Cita cita, string motivo, CancellationToken ct = default)
    {
        var asunto  = $"Cita cancelada — {cita.FechaHora:dd/MM/yyyy HH:mm}";
        var mensaje = $"Su cita del {cita.FechaHora:dd/MM/yyyy} ha sido CANCELADA. " +
                      $"Motivo: {motivo}.";
        await EnviarATodosLosCanalesAsync(cita, asunto, mensaje, "Cancelacion", ct);
    }

    public async Task NotificarReprogramacionCitaAsync(Cita cita, CancellationToken ct = default)
    {
        var asunto  = $"Cita reprogramada — nueva fecha {cita.FechaHora:dd/MM/yyyy HH:mm}";
        var mensaje = $"Su cita ha sido REPROGRAMADA para el {cita.FechaHora:dd/MM/yyyy} " +
                      $"a las {cita.FechaHora:HH:mm} con {cita.Profesional?.NombresCompletos}.";
        await EnviarATodosLosCanalesAsync(cita, asunto, mensaje, "Modificacion", ct);
    }

    public async Task EnviarRecordatorioAsync(Cita cita, CancellationToken ct = default)
    {
        var asunto  = $"Recordatorio: cita mañana a las {cita.FechaHora:HH:mm}";
        var mensaje = $"RECORDATORIO: Mañana tiene cita de {cita.TipoCita?.Nombre} " +
                      $"a las {cita.FechaHora:HH:mm} con {cita.Profesional?.NombresCompletos}.";
        await EnviarATodosLosCanalesAsync(cita, asunto, mensaje, "Recordatorio", ct);
    }

    private async Task EnviarATodosLosCanalesAsync(
        Cita cita, string asunto, string mensaje,
        string tipoEvento, CancellationToken ct)
    {
        var paciente = cita.Paciente;
        if (paciente is null) return;

        if (!string.IsNullOrWhiteSpace(paciente.Email))
            await EnviarEmailAsync(cita, paciente.Email, asunto, mensaje, tipoEvento, ct);

        if (!string.IsNullOrWhiteSpace(paciente.Whatsapp))
            await EnviarWhatsAppAsync(cita, paciente.Whatsapp, mensaje, tipoEvento, ct);
        else if (!string.IsNullOrWhiteSpace(paciente.Celular))
            await EnviarSmsAsync(cita, paciente.Celular, mensaje, tipoEvento, ct);
    }

    private async Task EnviarEmailAsync(
        Cita cita, string destinatario, string asunto,
        string mensajeTexto, string tipoEvento, CancellationToken ct)
    {
        var log = new NotificacionLog(cita.Id, "Email", destinatario, tipoEvento);
        try
        {
            var smtpHost  = _config["Smtp:Host"]      ?? "smtp.gmail.com";
            var smtpPort  = int.Parse(_config["Smtp:Port"] ?? "587");
            var smtpUser  = _config["Smtp:Usuario"]   ?? string.Empty;
            var smtpPass  = _config["Smtp:Password"]  ?? string.Empty;
            var remitente = _config["Smtp:Remitente"] ?? "agendamedica@clinica.com";

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials    = new NetworkCredential(smtpUser, smtpPass),
                EnableSsl      = true,
                DeliveryMethod = SmtpDeliveryMethod.Network
            };

            var mail = new MailMessage
            {
                From       = new MailAddress(remitente, "Agenda Médica"),
                Subject    = asunto,
                Body       = mensajeTexto,
                IsBodyHtml = false
            };
            mail.To.Add(destinatario);

            await client.SendMailAsync(mail, ct);
            log.RegistrarEnvio(exitoso: true);
            _logger.LogInformation("Email enviado a {Email} cita {Id}", destinatario, cita.Id);
        }
        catch (Exception ex)
        {
            log.RegistrarEnvio(false, ex.Message);
            _logger.LogWarning(ex, "Error email a {Email} cita {Id}", destinatario, cita.Id);
        }
        finally
        {
            await _db.NotificacionesLog.AddAsync(log, ct);
            await _db.SaveChangesAsync(ct);
        }
    }

    private async Task EnviarWhatsAppAsync(
        Cita cita, string numero, string mensaje,
        string tipoEvento, CancellationToken ct)
    {
        var log = new NotificacionLog(cita.Id, "WhatsApp", numero, tipoEvento);
        try
        {
            var token   = _config["WhatsApp:Token"]         ?? string.Empty;
            var phoneId = _config["WhatsApp:PhoneNumberId"] ?? string.Empty;

            if (string.IsNullOrWhiteSpace(token))
            { log.RegistrarEnvio(false, "WhatsApp no configurado."); return; }

            var numeroNorm = NormalizarNumero(numero);
            using var http = new HttpClient();
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

            var payload = new { messaging_product = "whatsapp", to = numeroNorm,
                                type = "text", text = new { body = mensaje } };
            var content = new StringContent(JsonSerializer.Serialize(payload),
                Encoding.UTF8, "application/json");
            var response = await http.PostAsync(
                $"https://graph.facebook.com/v18.0/{phoneId}/messages", content, ct);

            if (response.IsSuccessStatusCode)
                log.RegistrarEnvio(true);
            else
                log.RegistrarEnvio(false, $"HTTP {(int)response.StatusCode}");
        }
        catch (Exception ex) { log.RegistrarEnvio(false, ex.Message); }
        finally { await _db.NotificacionesLog.AddAsync(log, ct); await _db.SaveChangesAsync(ct); }
    }

    private async Task EnviarSmsAsync(
        Cita cita, string numero, string mensaje,
        string tipoEvento, CancellationToken ct)
    {
        var log = new NotificacionLog(cita.Id, "SMS", numero, tipoEvento);
        try
        {
            var smsUrl = _config["Sms:ApiUrl"] ?? string.Empty;
            if (string.IsNullOrWhiteSpace(smsUrl))
            { log.RegistrarEnvio(false, "SMS no configurado."); return; }

            var smsKey = _config["Sms:ApiKey"] ?? string.Empty;
            using var http = new HttpClient();
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {smsKey}");

            var payload = new { to = NormalizarNumero(numero),
                                message = mensaje.Length > 160 ? mensaje[..157] + "..." : mensaje };
            var content = new StringContent(JsonSerializer.Serialize(payload),
                Encoding.UTF8, "application/json");
            var response = await http.PostAsync(smsUrl, content, ct);

            log.RegistrarEnvio(response.IsSuccessStatusCode,
                response.IsSuccessStatusCode ? null : $"HTTP {(int)response.StatusCode}");
        }
        catch (Exception ex) { log.RegistrarEnvio(false, ex.Message); }
        finally { await _db.NotificacionesLog.AddAsync(log, ct); await _db.SaveChangesAsync(ct); }
    }

    private static string NormalizarNumero(string numero)
    {
        var limpio = new string(numero.Where(char.IsDigit).ToArray());
        if (limpio.StartsWith("57") && limpio.Length == 12) return $"+{limpio}";
        if (limpio.Length == 10 && limpio.StartsWith("3"))  return $"+57{limpio}";
        return limpio.StartsWith("+") ? numero : $"+{limpio}";
    }
}
