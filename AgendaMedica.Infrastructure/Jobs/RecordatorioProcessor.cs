// ============================================================
//  AGENDA MÉDICA — RECORDATORIO PROCESSOR
//  Proyecto : AgendaMedica.Infrastructure / Jobs
//  Archivo  : RecordatorioProcessor.cs
// ============================================================
//  Job que dispara rondas de recordatorios cada cierto intervalo
//  (appsettings "Recordatorios:IntervaloMinutos", por defecto 60).
//  La lógica de envío vive en IRecordatorioService para poder
//  dispararla también manualmente desde el endpoint de pruebas.
// ============================================================

using AgendaMedica.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AgendaMedica.Infrastructure.Jobs;

public class RecordatorioProcessor : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeSpan _intervalo;
    private readonly ILogger<RecordatorioProcessor> _logger;

    public RecordatorioProcessor(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<RecordatorioProcessor> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;

        var minutos = 60;
        if (int.TryParse(config["Recordatorios:IntervaloMinutos"], out var m) && m > 0)
            minutos = m;
        _intervalo = TimeSpan.FromMinutes(minutos);
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _logger.LogInformation("RecordatorioProcessor iniciado (intervalo {Min} min).",
            _intervalo.TotalMinutes);

        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var servicio = scope.ServiceProvider
                    .GetRequiredService<IRecordatorioService>();
                var enviados = await servicio.EnviarRondaAsync(ct);
                _logger.LogInformation(
                    "RecordatorioProcessor: ronda completada, {N} enviados.", enviados);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                _logger.LogError(ex, "Error en RecordatorioProcessor.");
            }

            await Task.Delay(_intervalo, ct);
        }
    }
}
