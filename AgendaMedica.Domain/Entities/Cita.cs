// ============================================================
//  AGENDA MÉDICA — ENTIDAD CITA (v1.1 actualizado)
//  Proyecto : AgendaMedica.Domain / Entities / Cita.cs
// ============================================================
//  Cambios v1.1:
//  - Agrega AseguradoraId: aseguradora vigente al momento de la cita
//  - Agrega TipoUsuarioId: régimen vigente al momento de la cita
//  IMPORTANTE: estos datos se registran en la CITA (no solo en
//  el paciente) porque el régimen y la aseguradora pueden cambiar
//  entre atenciones — es un dato de facturación de la atención.
// ============================================================

using AgendaMedica.Domain.Enums;
using AgendaMedica.Domain.Exceptions;

namespace AgendaMedica.Domain.Entities;

public class Cita : EntidadBase
{
    // ── Horario ───────────────────────────────────────────────
    public DateTime FechaHora    { get; private set; }
    public DateTime FechaHoraFin { get; private set; }

    // ── Relaciones ────────────────────────────────────────────
    public int  PacienteId    { get; private set; }
    public int  ProfesionalId { get; private set; }
    public int  TipoCitaId    { get; private set; }
    public byte EstadoCitaId  { get; private set; } = (byte)EstadoCita.Programada;

    // ── Cobertura vigente al momento de la cita ───────────────
    public int?  AseguradoraId { get; private set; }   // ← NUEVO
    public byte? TipoUsuarioId { get; private set; }   // ← NUEVO (régimen)

    // ── Integración Microsoft Teams ───────────────────────────
    public string? TeamsEventId { get; private set; }
    public string? TeamsJoinUrl { get; private set; }

    // ── Información clínica ───────────────────────────────────
    public string? MotivoConsulta { get; private set; }
    public string? Observaciones  { get; private set; }

    // ── Auditoría ─────────────────────────────────────────────
    public string  CreadoPor     { get; private set; } = string.Empty;
    public string? ModificadoPor { get; private set; }

    // ── Navegación ────────────────────────────────────────────
    public Paciente?    Paciente    { get; private set; }
    public Profesional? Profesional { get; private set; }
    public TipoCita?    TipoCita    { get; private set; }
    public Aseguradora? Aseguradora { get; private set; }   // ← NUEVO
    public TipoUsuario? TipoUsuario { get; private set; }   // ← NUEVO

    public ICollection<HistorialEstadoCita> Historial      { get; private set; } = new List<HistorialEstadoCita>();
    public ICollection<OutboxMensaje>       OutboxMensajes { get; private set; } = new List<OutboxMensaje>();
    public ICollection<NotificacionLog>     Notificaciones { get; private set; } = new List<NotificacionLog>();

    // ── Propiedades calculadas ────────────────────────────────
    public EstadoCita Estado          => (EstadoCita)EstadoCitaId;
    public int        DuracionMinutos => (int)(FechaHoraFin - FechaHora).TotalMinutes;

    protected Cita() { }

    // ── Factory method ────────────────────────────────────────
    public static Cita Crear(
        DateTime fechaHora,
        int      pacienteId,
        int      profesionalId,
        int      tipoCitaId,
        short    duracionMinutos,
        string   creadoPor,
        int?     aseguradoraId  = null,
        byte?    tipoUsuarioId  = null,
        string?  motivoConsulta = null,
        string?  observaciones  = null)
    {
        ValidarFechaHora(fechaHora);
        ValidarParticipantes(pacienteId, profesionalId, tipoCitaId);
        ArgumentException.ThrowIfNullOrWhiteSpace(creadoPor, nameof(creadoPor));

        var cita = new Cita
        {
            FechaHora      = fechaHora,
            FechaHoraFin   = fechaHora.AddMinutes(duracionMinutos),
            PacienteId     = pacienteId,
            ProfesionalId  = profesionalId,
            TipoCitaId     = tipoCitaId,
            EstadoCitaId   = (byte)EstadoCita.Programada,
            AseguradoraId  = aseguradoraId,
            TipoUsuarioId  = tipoUsuarioId,
            MotivoConsulta = motivoConsulta?.Trim(),
            Observaciones  = observaciones?.Trim(),
            CreadoPor      = creadoPor.Trim(),
        };

        cita.AgregarHistorial(null, EstadoCita.Programada, null, creadoPor, OrigenCambio.App);
        cita.AgregarOutbox(TipoOperacionOutbox.CrearEvento);

        return cita;
    }

    // ══════════════════════════════════════════════════════════
    //  MÉTODOS DE CICLO DE VIDA
    // ══════════════════════════════════════════════════════════
    public void Confirmar(string cambiadoPor, OrigenCambio origen = OrigenCambio.App)
    {
        ValidarTransicion(EstadoCita.Confirmada);
        CambiarEstado(EstadoCita.Confirmada, null, cambiadoPor, origen);
    }

    public void IniciarAtencion(string cambiadoPor)
    {
        ValidarTransicion(EstadoCita.EnAtencion);
        CambiarEstado(EstadoCita.EnAtencion, null, cambiadoPor, OrigenCambio.App);
    }

    public void MarcarRealizada(string cambiadoPor)
    {
        ValidarTransicion(EstadoCita.Realizada);
        CambiarEstado(EstadoCita.Realizada, null, cambiadoPor, OrigenCambio.App);
    }

    public void Cancelar(string motivo, string cambiadoPor, OrigenCambio origen = OrigenCambio.App)
    {
        ValidarTransicion(EstadoCita.Cancelada);
        ArgumentException.ThrowIfNullOrWhiteSpace(motivo, nameof(motivo));
        CambiarEstado(EstadoCita.Cancelada, motivo, cambiadoPor, origen);
        if (!string.IsNullOrEmpty(TeamsEventId))
            AgregarOutbox(TipoOperacionOutbox.CancelarEvento);
    }

    public void Reprogramar(DateTime nuevaFechaHora, short duracionMinutos,
                            string motivo, string cambiadoPor,
                            OrigenCambio origen = OrigenCambio.App)
    {
        ValidarTransicion(EstadoCita.Reprogramada);
        ValidarFechaHora(nuevaFechaHora);
        ArgumentException.ThrowIfNullOrWhiteSpace(motivo, nameof(motivo));
        FechaHora    = nuevaFechaHora;
        FechaHoraFin = nuevaFechaHora.AddMinutes(duracionMinutos);
        CambiarEstado(EstadoCita.Reprogramada, motivo, cambiadoPor, origen);
        if (!string.IsNullOrEmpty(TeamsEventId))
            AgregarOutbox(TipoOperacionOutbox.ActualizarEvento);
    }

    public void MarcarNoAsistio(string cambiadoPor)
    {
        ValidarTransicion(EstadoCita.NoAsistio);
        CambiarEstado(EstadoCita.NoAsistio, null, cambiadoPor, OrigenCambio.App);
    }

    public void ActualizarObservaciones(string? observaciones, string cambiadoPor)
    {
        Observaciones = observaciones?.Trim();
        ModificadoPor = cambiadoPor;
        MarcarModificado();
    }

    /// <summary>
    /// Actualiza la cobertura de la cita (aseguradora y régimen vigentes).
    /// Se puede llamar antes de confirmar si el paciente cambió de EPS.
    /// </summary>
    public void ActualizarCobertura(int? aseguradoraId, byte? tipoUsuarioId, string cambiadoPor)
    {
        AseguradoraId = aseguradoraId;
        TipoUsuarioId = tipoUsuarioId;
        ModificadoPor = cambiadoPor;
        MarcarModificado();
    }

    public void RegistrarEventoTeams(string teamsEventId, string? teamsJoinUrl)
    {
        if (string.IsNullOrWhiteSpace(teamsEventId))
            throw new DomainException("El ID del evento Teams no puede estar vacío.");
        TeamsEventId = teamsEventId;
        TeamsJoinUrl = teamsJoinUrl;
        MarcarModificado();
    }

    // ── Privados ──────────────────────────────────────────────
    private void CambiarEstado(EstadoCita nuevoEstado, string? motivo,
                               string cambiadoPor, OrigenCambio origen)
    {
        var estadoAnterior = Estado;
        EstadoCitaId  = (byte)nuevoEstado;
        ModificadoPor = cambiadoPor;
        MarcarModificado();
        AgregarHistorial(estadoAnterior, nuevoEstado, motivo, cambiadoPor, origen);
    }

    private void AgregarHistorial(EstadoCita? ant, EstadoCita nuevo,
                                  string? motivo, string cambiadoPor, OrigenCambio origen)
    {
        Historial.Add(new HistorialEstadoCita(
            estadoAnteriorId: ant.HasValue ? (byte?)((byte)ant.Value) : null,
            estadoNuevoId:    (byte)nuevo,
            motivo:           motivo,
            cambiadoPor:      cambiadoPor,
            origen:           origen.ToString()
        ));
    }

    private void AgregarOutbox(TipoOperacionOutbox operacion)
        => OutboxMensajes.Add(new OutboxMensaje(operacion.ToString()));

    private static readonly Dictionary<EstadoCita, HashSet<EstadoCita>> _transiciones = new()
    {
        [EstadoCita.Programada]   = new() { EstadoCita.Confirmada, EstadoCita.Cancelada, EstadoCita.Reprogramada },
        [EstadoCita.Confirmada]   = new() { EstadoCita.EnAtencion, EstadoCita.Cancelada, EstadoCita.NoAsistio, EstadoCita.Reprogramada },
        [EstadoCita.EnAtencion]   = new() { EstadoCita.Realizada },
        [EstadoCita.Realizada]    = new(),
        [EstadoCita.Cancelada]    = new(),
        [EstadoCita.NoAsistio]    = new(),
        [EstadoCita.Reprogramada] = new() { EstadoCita.Confirmada, EstadoCita.Cancelada },
    };

    private void ValidarTransicion(EstadoCita destino)
    {
        if (!_transiciones.TryGetValue(Estado, out var permitidos) ||
            !permitidos.Contains(destino))
            throw new DomainException(
                $"No se puede pasar de '{Estado}' a '{destino}'. " +
                $"Transiciones permitidas: {string.Join(", ", _transiciones[Estado])}.");
    }

    private static void ValidarFechaHora(DateTime f)
    {
        if (f <= DateTime.UtcNow)
            throw new DomainException("La fecha y hora de la cita debe ser futura.");
    }

    private static void ValidarParticipantes(int p, int pr, int t)
    {
        if (p  <= 0) throw new DomainException("El paciente es requerido.");
        if (pr <= 0) throw new DomainException("El profesional es requerido.");
        if (t  <= 0) throw new DomainException("El tipo de cita es requerido.");
    }
}
