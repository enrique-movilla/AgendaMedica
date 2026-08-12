// ============================================================
//  AGENDA MÉDICA — ENTIDAD BLOQUEO DE AGENDA
//  Proyecto : AgendaMedica.Domain / Entities
// ============================================================
//  Representa un bloqueo en la agenda del profesional:
//  - Vacaciones o congresos: FechaDesde..FechaHasta completas
//    (sin horas, bloquea todo el día)
//  - Descanso o almuerzo: franja horaria dentro del rango de fechas
//  Los slots libres no se generan dentro de un bloqueo.
// ============================================================

using AgendaMedica.Domain.Exceptions;

namespace AgendaMedica.Domain.Entities;

public class BloqueoAgenda : EntidadBase, IActivable
{
    // ── Profesional asignado ──────────────────────────────────
    public int ProfesionalId { get; private set; }

    // ── Rango de fechas ───────────────────────────────────────
    public DateOnly FechaDesde { get; private set; }
    public DateOnly FechaHasta { get; private set; }

    // ── Franja horaria (null = día completo) ──────────────────
    public TimeSpan? HoraInicio { get; private set; }
    public TimeSpan? HoraFin    { get; private set; }

    // ── Motivo ────────────────────────────────────────────────
    public string Motivo { get; private set; } = string.Empty;

    // ── Control ───────────────────────────────────────────────
    public bool Activo { get; private set; } = true;

    // ── Navegación ────────────────────────────────────────────
    public Profesional? Profesional { get; private set; }

    protected BloqueoAgenda() { }

    public BloqueoAgenda(
        int       profesionalId,
        DateOnly  fechaDesde,
        DateOnly  fechaHasta,
        string    motivo,
        TimeSpan? horaInicio = null,
        TimeSpan? horaFin    = null)
    {
        ProfesionalId = profesionalId;
        FechaDesde    = fechaDesde;
        FechaHasta    = fechaHasta;
        Motivo        = motivo?.Trim() ?? string.Empty;
        HoraInicio    = horaInicio;
        HoraFin       = horaFin;
        Validar();
    }

    public void Actualizar(
        DateOnly  fechaDesde,
        DateOnly  fechaHasta,
        string    motivo,
        TimeSpan? horaInicio = null,
        TimeSpan? horaFin    = null)
    {
        FechaDesde    = fechaDesde;
        FechaHasta    = fechaHasta;
        Motivo        = motivo?.Trim() ?? string.Empty;
        HoraInicio    = horaInicio;
        HoraFin       = horaFin;
        Validar();
        MarcarModificado();
    }

    public void Inactivar()
    {
        Activo = false;
        MarcarModificado();
    }

    public void Activar()
    {
        Activo = true;
        MarcarModificado();
    }

    // ── Validaciones privadas ─────────────────────────────────
    private void Validar()
    {
        if (ProfesionalId <= 0)
            throw new DomainException("El profesional es requerido.");
        if (FechaHasta < FechaDesde)
            throw new DomainException(
                "La fecha final no puede ser anterior a la fecha inicial.");
        if ((HoraInicio is null) != (HoraFin is null))
            throw new DomainException(
                "Debe indicar hora de inicio y fin, o ninguna para bloquear el día completo.");
        if (HoraInicio is not null && HoraFin is not null && HoraFin <= HoraInicio)
            throw new DomainException(
                "La hora de inicio debe ser anterior a la hora de fin.");
        if (string.IsNullOrWhiteSpace(Motivo))
            throw new DomainException("El motivo del bloqueo es requerido.");
        if (Motivo.Length > 200)
            throw new DomainException("El motivo no puede superar los 200 caracteres.");
    }
}