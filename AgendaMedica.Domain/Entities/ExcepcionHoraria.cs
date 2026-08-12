// ============================================================
//  AGENDA MÉDICA — ENTIDAD EXCEPCIÓN HORARIA
//  Proyecto : AgendaMedica.Domain / Entities
// ============================================================
//  Representa una modificación puntual de la disponibilidad
//  para un día concreto (reemplaza la plantilla semanal ese día).
//  Ejemplos: un día de jornada reducida, un puente especial,
//  horarios ampliados por campañas.
// ============================================================

using AgendaMedica.Domain.Exceptions;

namespace AgendaMedica.Domain.Entities;

public class ExcepcionHoraria : EntidadBase, IActivable
{
    // ── Profesional asignado ──────────────────────────────────
    public int ProfesionalId { get; private set; }

    // ── Fecha puntual y franja que reemplaza la plantilla ─────
    public DateOnly Fecha      { get; private set; }
    public TimeSpan HoraInicio { get; private set; }
    public TimeSpan HoraFin    { get; private set; }

    // ── Control ───────────────────────────────────────────────
    public bool Activo { get; private set; } = true;

    // ── Navegación ────────────────────────────────────────────
    public Profesional? Profesional { get; private set; }

    protected ExcepcionHoraria() { }

    public ExcepcionHoraria(
        int      profesionalId,
        DateOnly fecha,
        TimeSpan horaInicio,
        TimeSpan horaFin)
    {
        ProfesionalId = profesionalId;
        Fecha         = fecha;
        HoraInicio    = horaInicio;
        HoraFin       = horaFin;
        Validar();
    }

    public void Actualizar(
        DateOnly fecha,
        TimeSpan horaInicio,
        TimeSpan horaFin)
    {
        Fecha      = fecha;
        HoraInicio = horaInicio;
        HoraFin    = horaFin;
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
        if (HoraInicio >= HoraFin)
            throw new DomainException(
                "La hora de inicio debe ser anterior a la hora de fin.");
    }
}