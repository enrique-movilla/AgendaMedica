// ============================================================
//  AGENDA MÉDICA — BLOQUEO PREVENTIVO DE TURNOS (Fase 3)
//  Proyecto : AgendaMedica.Infrastructure / Servicios
//  Archivo  : BloqueoTurnoServicio.cs
// ============================================================
//  Bloqueo en memoria (MemoryCache) con expiración de 5 minutos.
//  Clave del slot: "turno:{profesionalId}:{fecha:yyyyMMdd}:{hora}".
//  Al reservar se guarda el token bajo esa clave; si otro usuario
//  intenta reservar el mismo slot recibe un rechazo. La validación
//  final (atómica) ocurre en BD al crear la cita.
// ============================================================

using AgendaMedica.Domain.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace AgendaMedica.Infrastructure.Servicios;

public class BloqueoTurnoServicio : IBloqueoTurnoServicio
{
    private readonly IMemoryCache       _cache;
    private readonly ILogger<BloqueoTurnoServicio> _logger;

    private static readonly TimeSpan Duracion = TimeSpan.FromMinutes(5);

    // Clave del slot → token vigente; token → usuario dueño del claim.
    private const string PREFIJO_SLOT  = "turno:";

    public BloqueoTurnoServicio(
        IMemoryCache cache,
        ILogger<BloqueoTurnoServicio> logger)
    {
        _cache  = cache;
        _logger = logger;
    }

    private static string ClaveSlot(int profesionalId, DateOnly fecha, string horaInicio)
        => $"{PREFIJO_SLOT}{profesionalId}:{fecha:yyyyMMdd}:{horaInicio.TrimEnd(':', '0', 'm')}";

    private static string ClaveSlotDia(int profesionalId, DateOnly fecha)
        => $"{PREFIJO_SLOT}{profesionalId}:{fecha:yyyyMMdd}:";

    public Task<ResultadoReservaBloqueo> ReservarAsync(
        int profesionalId, DateOnly fecha, string horaInicio,
        string usuario, CancellationToken ct = default)
    {
        var clave = ClaveSlot(profesionalId, fecha, horaInicio);
        var token = Guid.NewGuid().ToString("N");
        var expiraEn = DateTime.UtcNow.Add(Duracion);

        if (_cache.TryGetValue(clave, out string? duenio) && !string.IsNullOrEmpty(duenio))
        {
            return Task.FromResult(new ResultadoReservaBloqueo(
                Exitoso: false,
                BloqueoId: null,
                Token: null,
                ExpiraEn: default,
                MotivoRechazo: $"El turno ya está reservado por {duenio}."));
        }

        // El token también se guarda bajo su propia clave para poder liberar.
        _cache.Set(clave, usuario,
            new MemoryCacheEntryOptions().SetAbsoluteExpiration(Duracion));
        _cache.Set($"token:{token}", clave,
            new MemoryCacheEntryOptions().SetAbsoluteExpiration(Duracion));

        _logger.LogInformation("Turno reservado {Clave} por {Usuario}", clave, usuario);
        return Task.FromResult(new ResultadoReservaBloqueo(
            Exitoso: true, BloqueoId: token, Token: token, ExpiraEn: expiraEn));
    }

    public Task<ResultadoReservaBloqueo> RenovarAsync(
        string bloqueoId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(bloqueoId) ||
            !_cache.TryGetValue($"token:{bloqueoId}", out string? clave) ||
            string.IsNullOrEmpty(clave))
            return Task.FromResult(new ResultadoReservaBloqueo(
                false, null, null, default, "El bloqueo no existe o expiró."));

        // Restablece la expiración para ambos (slot y token).
        _cache.Set($"token:{bloqueoId}", clave,
            new MemoryCacheEntryOptions().SetAbsoluteExpiration(Duracion));
        _cache.TryGetValue(clave, out string? duenio);
        var expiraEn = DateTime.UtcNow.Add(Duracion);
        return Task.FromResult(new ResultadoReservaBloqueo(
            true, bloqueoId, bloqueoId, expiraEn));
    }

    public Task<bool> LiberarAsync(string bloqueoId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(bloqueoId) ||
            !_cache.TryGetValue($"token:{bloqueoId}", out string? clave) ||
            string.IsNullOrEmpty(clave))
            return Task.FromResult(false);

        _cache.Remove($"token:{bloqueoId}");
        _cache.Remove(clave);
        _logger.LogInformation("Turno liberado {Clave}", clave);
        return Task.FromResult(true);
    }

    public Task<bool> EsValidoAsync(
        int profesionalId, DateOnly fecha, string horaInicio,
        string bloqueoId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(bloqueoId))
            return Task.FromResult(false);

        // El token debe existir y corresponder al MISMO PROFESIONAL y DÍA reservados.
        // La hora exacta NO se exige aquí: el traslape de horario se valida de forma
        // atómica en BD al insertar, y así no dependemos de que el frontend recompute
        // la hora con el mismo formato (evita falsos“turno ya no reservado” p. ej.
        // por diferencias de zona/segundos entre la reserva y la creación).
        var ok = _cache.TryGetValue($"token:{bloqueoId}", out string? claveSlot)
                 && !string.IsNullOrEmpty(claveSlot)
                 && claveSlot.StartsWith(ClaveSlotDia(profesionalId, fecha));

        return Task.FromResult(ok);
    }
}