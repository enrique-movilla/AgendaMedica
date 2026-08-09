// ============================================================
//  AGENDA MÉDICA — ENTIDAD DISPONIBILIDAD PROFESIONAL
//  Proyecto : AgendaMedica.Domain / Entities
// ============================================================
//  Representa la plantilla horaria del profesional:
//  - Qué días atiende (Lunes..Domingo)
//  - En qué rango de horas (HoraInicio .. HoraFin)
//  - Duración estándar de cada consulta (15/20/30 min…)
//  - Sede y consultorio donde atiende (opcional por plantilla)
// ============================================================

using AgendaMedica.Domain.Enums;
using AgendaMedica.Domain.Exceptions;

namespace AgendaMedica.Domain.Entities;

public class DisponibilidadProfesional : EntidadBase, IActivable
{
    // ── Profesional asignado ──────────────────────────────────
    public int     ProfesionalId { get; private set; }

    // ── Patrón semanal ────────────────────────────────────────
    public DiaSemana DiaSemana    { get; private set; }
    public TimeSpan  HoraInicio   { get; private set; }
    public TimeSpan  HoraFin      { get; private set; }
    public short     DuracionMinutos { get; private set; }

    // ── Ubicación de la atención ──────────────────────────────
    public int?     SedeId          { get; private set; }
    public string?  ConsultorioSala { get; private set; }

    // ── Control ───────────────────────────────────────────────
    public bool Activo { get; private set; } = true;

    // ── Navegación ────────────────────────────────────────────
    public Profesional? Profesional { get; private set; }

    protected DisponibilidadProfesional() { }

    public DisponibilidadProfesional(
        int      profesionalId,
        DiaSemana d,
        TimeOnly horaInicio,
        TimeOnly horaFin,
        short    duracionMinutos,
        int?     sedeId          = null,
        string?  consultorioSala = null)
    {
        if (profesionalId <= 0)
            throw new DomainException("El profesional es requerido.");
        if ((byte)d < (byte)DiaSemana.Lunes || (byte)d > (byte)DiaSemana.Domingo)
            throw new DomainException("El día de la semana no es válido.");

        ProfesionalId   = profesionalId;
        DiaSemana       = d;
        HoraInicio      = horaInicio.ToTimeSpan();
        HoraFin         = horaFin.ToTimeSpan();
        DuracionMinutos = duracionMinutos;
        SedeId          = sedeId;
        ConsultorioSala = consultorioSala?.Trim();
        ValidarRango();
    }

    public void Actualizar(
        DiaSemana d,
        TimeOnly horaInicio,
        TimeOnly horaFin,
        short    duracionMinutos,
        int?     sedeId          = null,
        string?  consultorioSala = null)
    {
        DiaSemana       = d;
        HoraInicio      = horaInicio.ToTimeSpan();
        HoraFin         = horaFin.ToTimeSpan();
        DuracionMinutos = duracionMinutos;
        SedeId          = sedeId;
        ConsultorioSala = consultorioSala?.Trim();
        ValidarRango();
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
    private void ValidarRango()
    {
        if (HoraInicio >= HoraFin)
            throw new DomainException(
                "La hora de inicio debe ser anterior a la hora de fin.");
        if (DuracionMinutos < 5 || DuracionMinutos > 480)
            throw new DomainException(
                "La duración de consulta debe estar entre 5 y 480 minutos.");
        if (SedeId is <= 0)
            throw new DomainException("La sede no es válida.");
    }
}