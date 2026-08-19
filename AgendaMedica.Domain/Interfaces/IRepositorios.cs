// ============================================================
//  AGENDA MÉDICA — INTERFACES DE REPOSITORIOS (v1.1)
//  Proyecto : AgendaMedica.Domain / Interfaces / IRepositorios.cs
// ============================================================
//  Cambios v1.1:
//  - Agrega IDepartamentoRepositorio, IMunicipioRepositorio
//  - Agrega ITipoEntidadRepositorio, ITipoUsuarioRepositorio
//  - Actualiza IAseguradoraRepositorio con nuevas búsquedas
//  - Actualiza IUnitOfWork con los nuevos repositorios
// ============================================================

using AgendaMedica.Domain.Entities;

namespace AgendaMedica.Domain.Interfaces;

// ── Repositorio base genérico ─────────────────────────────────
public interface IRepositorio<T> where T : EntidadBase
{
    Task<T?>       ObtenerPorIdAsync(int id, CancellationToken ct = default);
    Task<IList<T>> ObtenerTodosAsync(CancellationToken ct = default);
    Task           AgregarAsync(T entidad, CancellationToken ct = default);
    void           Actualizar(T entidad);
    void           Eliminar(T entidad);
}

// ── IUnitOfWork ───────────────────────────────────────────────
public interface IUnitOfWork : IAsyncDisposable
{
    // Principales
    ICitaRepositorio               Citas                { get; }
    IPacienteRepositorio           Pacientes            { get; }
    IProfesionalRepositorio        Profesionales        { get; }

    // Plantillas de disponibilidad (agenda)
    IDisponibilidadRepositorio     Disponibilidades     { get; }

    // Bloqueos de agenda y excepciones horarias
    IBloqueoAgendaRepositorio      BloqueosAgenda       { get; }
    IExcepcionHorariaRepositorio   ExcepcionesHorarias  { get; }

    // Catálogos propios
    IAseguradoraRepositorio        Aseguradoras         { get; }
    IEspecialidadRepositorio       Especialidades       { get; }
    ISedeRepositorio               Sedes                { get; }
    ITipoCitaRepositorio           TiposCita            { get; }
    IMotivoCancelacionRepositorio  MotivosCancelacion   { get; }

    // Catálogos compartidos (nuevos v1.1)
    IDepartamentoRepositorio       Departamentos        { get; }
    IMunicipioRepositorio          Municipios           { get; }
    ITipoEntidadRepositorio        TiposEntidad         { get; }
    ITipoUsuarioRepositorio        TiposUsuario         { get; }

    // Especiales (Id no-int)
    ITipoIdentificacionRepositorio TiposIdentificacion  { get; }

    Task<int> GuardarAsync(CancellationToken ct = default);
}

// ── ICitaRepositorio ──────────────────────────────────────────
public interface ICitaRepositorio : IRepositorio<Cita>
{
    Task<IList<Cita>> ObtenerPorProfesionalYFechaAsync(
        int profesionalId, DateOnly fechaDesde, DateOnly fechaHasta,
        CancellationToken ct = default);

    Task<IList<Cita>> ObtenerPorPacienteAsync(
        int pacienteId, int pagina = 1, int tamPagina = 10,
        CancellationToken ct = default);

    Task<Cita?> ObtenerPorTeamsEventIdAsync(
        string teamsEventId, CancellationToken ct = default);

    Task<bool> ExisteTraslapeAsync(
        int profesionalId, DateTime fechaHoraInicio, DateTime fechaHoraFin,
        int? citaIdExcluir = null, CancellationToken ct = default);

    Task<IList<Cita>> ObtenerAgendaDiaAsync(
        int profesionalId, DateOnly fecha, CancellationToken ct = default);

    Task<IList<Cita>> ObtenerAgendaRangoAsync(
        IReadOnlyCollection<int> profesionalesIds, DateOnly fechaDesde, DateOnly fechaHasta,
        CancellationToken ct = default);

    Task<IList<OutboxMensaje>> ObtenerOutboxPendientesAsync(
        int cantidad = 10, CancellationToken ct = default);

    /// <summary>
    /// Crea la cita de forma atómica contra la BD usando un advisory
    /// lock de PostgreSQL por profesional (evita doble agendamiento
    /// concurrente). Re-valida el traslape dentro de la transacción.
    /// Devuelve false si hubo traslape (sin insertar).
    /// </summary>
    Task<bool> CrearCitaAtomicoAsync(
        Cita cita, DateTime fechaHoraInicio, DateTime fechaHoraFin,
        CancellationToken ct = default);

    /// <summary>
    /// Persiste los cambios de una cita ya cargada re-validando el
    /// traslape dentro de una transacción con advisory lock por
    /// profesional. Devuelve false si el nuevo horario choca (sin guardar).
    /// </summary>
    Task<bool> ModificarCitaAtomicoAsync(
        Cita cita, DateTime fechaHoraInicio, DateTime fechaHoraFin,
        CancellationToken ct = default);
}

// ── IPacienteRepositorio ──────────────────────────────────────
public interface IPacienteRepositorio : IRepositorio<Paciente>
{
    Task<Paciente?> ObtenerPorIdentificacionAsync(
        byte tipoIdentificacionId, string numeroIdentificacion,
        CancellationToken ct = default);

    Task<(IList<Paciente> Items, int Total)> BuscarAsync(
        string? nombre = null, byte? tipoIdentificacionId = null,
        string? numeroIdentificacion = null, int? aseguradoraId = null,
        int pagina = 1, int tamPagina = 20, CancellationToken ct = default);

    Task<bool> ExisteIdentificacionAsync(
        byte tipoIdentificacionId, string numeroIdentificacion,
        int? excluirId = null, CancellationToken ct = default);
}

// ── IProfesionalRepositorio ───────────────────────────────────
public interface IProfesionalRepositorio : IRepositorio<Profesional>
{
    Task<IList<Profesional>> ObtenerPorIdsAsync(
        IReadOnlyCollection<int> ids, CancellationToken ct = default);

    Task<IList<Profesional>> ObtenerPorEspecialidadAsync(
        int especialidadId, CancellationToken ct = default);

    Task<IList<Profesional>> ObtenerPorSedeAsync(
        int sedeId, CancellationToken ct = default);

    Task<bool> ExisteIdentificacionAsync(
        byte tipoIdentificacionId, string numeroIdentificacion,
        int? excluirId = null, CancellationToken ct = default);
}

// ── IDisponibilidadRepositorio (plantillas horarias) ──────────
public interface IDisponibilidadRepositorio : IRepositorio<DisponibilidadProfesional>
{
/// <summary>Devuelve las plantillas activas de un profesional.</summary>
    Task<IList<DisponibilidadProfesional>> ObtenerTodasDelProfesionalAsync(
        int profesionalId, CancellationToken ct = default);

    /// <summary>Devuelve las plantillas activas del profesional para un día de la semana.</summary>
    Task<IList<DisponibilidadProfesional>> ObtenerPorDiaAsync(
        int profesionalId, byte diaSemana, CancellationToken ct = default);
}

// ── IBloqueoAgendaRepositorio (bloqueos de agenda) ─────────────
public interface IBloqueoAgendaRepositorio : IRepositorio<BloqueoAgenda>
{
    /// <summary>Devuelve los bloqueos activos de un profesional.</summary>
    Task<IList<BloqueoAgenda>> ObtenerTodasDelProfesionalAsync(
        int profesionalId, CancellationToken ct = default);

    /// <summary>Devuelve los bloqueos activos que cubren una fecha concreta.</summary>
    Task<IList<BloqueoAgenda>> ObtenerPorFechaAsync(
        int profesionalId, DateOnly fecha, CancellationToken ct = default);
}

// ── IExcepcionHorariaRepositorio (excepciones horarias) ────────
public interface IExcepcionHorariaRepositorio : IRepositorio<ExcepcionHoraria>
{
    /// <summary>Devuelve las excepciones activas de un profesional.</summary>
    Task<IList<ExcepcionHoraria>> ObtenerTodasDelProfesionalAsync(
        int profesionalId, CancellationToken ct = default);

    /// <summary>Devuelve las excepciones activas de un profesional para una fecha concreta.</summary>
    Task<IList<ExcepcionHoraria>> ObtenerPorFechaAsync(
        int profesionalId, DateOnly fecha, CancellationToken ct = default);
}

// ── IAseguradoraRepositorio (actualizado) ─────────────────────
public interface IAseguradoraRepositorio : IRepositorio<Aseguradora>
{
    Task<IList<Aseguradora>> ObtenerActivasAsync(CancellationToken ct = default);

    Task<IList<Aseguradora>> BuscarAsync(
        string? nombre        = null,
        byte?   tipoEntidadId = null,
        CancellationToken ct  = default);

    Task<Aseguradora?> ObtenerPorCodigoAsync(
        string codigo, CancellationToken ct = default);
}

// ── IEspecialidadRepositorio ──────────────────────────────────
public interface IEspecialidadRepositorio : IRepositorio<Especialidad>
{
    Task<IList<Especialidad>> ObtenerActivasAsync(CancellationToken ct = default);
}

// ── ISedeRepositorio ──────────────────────────────────────────
public interface ISedeRepositorio : IRepositorio<Sede>
{
    Task<IList<Sede>> ObtenerActivasAsync(CancellationToken ct = default);
}

// ── ITipoCitaRepositorio ──────────────────────────────────────
public interface ITipoCitaRepositorio : IRepositorio<TipoCita>
{
    Task<IList<TipoCita>> ObtenerActivasPorCategoriaAsync(
        string? categoria = null, CancellationToken ct = default);
}

// ── IMotivoCancelacionRepositorio ──────────────────────────────
public interface IMotivoCancelacionRepositorio : IRepositorio<MotivoCancelacion>
{
    Task<IList<MotivoCancelacion>> ObtenerActivosAsync(CancellationToken ct = default);
}

// ── IDepartamentoRepositorio (NUEVO) ──────────────────────────
public interface IDepartamentoRepositorio
{
    Task<IList<Departamento>> ObtenerTodosAsync(CancellationToken ct = default);
    Task<Departamento?> ObtenerPorCodigoAsync(string codigoDane, CancellationToken ct = default);
}

// ── IMunicipioRepositorio (NUEVO) ─────────────────────────────
public interface IMunicipioRepositorio
{
    Task<IList<Municipio>> ObtenerPorDepartamentoAsync(
        string codigoDepartamento, CancellationToken ct = default);

    Task<Municipio?> ObtenerPorCodigoAsync(
        string codigoDane, CancellationToken ct = default);

    Task<IList<Municipio>> BuscarAsync(
        string nombre, CancellationToken ct = default);
}

// ── ITipoEntidadRepositorio (NUEVO) ───────────────────────────
public interface ITipoEntidadRepositorio
{
    Task<IList<TipoEntidad>> ObtenerTodosAsync(CancellationToken ct = default);
    Task<TipoEntidad?> ObtenerPorIdAsync(byte id, CancellationToken ct = default);
}

// ── ITipoUsuarioRepositorio (NUEVO) ───────────────────────────
public interface ITipoUsuarioRepositorio
{
    Task<IList<TipoUsuario>> ObtenerTodosAsync(CancellationToken ct = default);
    Task<TipoUsuario?> ObtenerPorIdAsync(byte id, CancellationToken ct = default);
}

// ── ITipoIdentificacionRepositorio ───────────────────────────
// TipoIdentificacion usa byte como Id, no hereda de EntidadBase
public interface ITipoIdentificacionRepositorio
{
    Task<TipoIdentificacion?> ObtenerPorIdAsync(byte id, CancellationToken ct = default);
    Task<IList<TipoIdentificacion>> ObtenerTodosAsync(CancellationToken ct = default);
}
