// ============================================================
//  AGENDA MÉDICA — DTOs ACTUALIZADOS (v1.1)
//  Proyecto : AgendaMedica.Application / DTOs
//  Archivo  : DTOs_v11.cs  → reemplaza DTOs.cs
// ============================================================

namespace AgendaMedica.Application.DTOs;

// ── Cita (ahora incluye Aseguradora y régimen) ────────────────
public record CitaDto(
    int      Id,
    DateTime FechaHora,
    DateTime FechaHoraFin,
    int      DuracionMinutos,
    string   Estado,
    byte     EstadoId,
    TipoCitaDto           TipoCita,
    PacienteResumenDto    Paciente,
    ProfesionalResumenDto Profesional,
    AseguradoraResumenDto? Aseguradora,   // ← NUEVO
    TipoUsuarioDto?        TipoUsuario,   // ← NUEVO (régimen)
    string?  MotivoConsulta,
    string?  Observaciones,
    string?  TeamsEventId,
    string?  TeamsJoinUrl,
    string   CreadoPor,
    DateTime FechaCreacion,
    DateTime? FechaModificacion
);

// ── Ítem de agenda del día ────────────────────────────────────
public record AgendaDiaItemDto(
    int     CitaId,
    string  HoraInicio,
    string  HoraFin,
    string  Paciente,
    string  Identificacion,
    int     EdadPaciente,
    char    Sexo,
    string  TipoCita,
    string  Estado,
    byte    EstadoId,
    string? Aseguradora,     // "EPS SURA — Contributivo"
    string? Regimen,         // ← NUEVO: nombre del TipoUsuario
    string? MotivoConsulta,
    string? TeamsJoinUrl
);

// ── Disponibilidad ────────────────────────────────────────────
public record DisponibilidadDto(
    int              ProfesionalId,
    string           NombreProfesional,
    DateOnly         Fecha,
    int              DuracionSlotMinutos,
    List<SlotOcupadoDto> SlotsOcupados,
    List<SlotLibreDto>   SlotsLibres        // ← Fase 1: slots disponibles
);

public record SlotOcupadoDto(string HoraInicio, string HoraFin, string Estado);

public record SlotLibreDto(
    string  HoraInicio,
    string  HoraFin,
    bool    Disponible,
    string? ConsultorioSala
);

// ── Plantilla de disponibilidad de un profesional ─────────────
public record DisponibilidadProfesionalDto(
    int     Id,
    int     ProfesionalId,
    string  NombreProfesional,
    byte    DiaSemana,
    string  NombreDia,
    string  HoraInicio,
    string  HoraFin,
    short   DuracionMinutos,
    int?    SedeId,
    string? Sede,
    string? ConsultorioSala,
    bool    Activo
);

// ── Paciente resumen ──────────────────────────────────────────
public record PacienteResumenDto(
    int     Id,
    string  TipoIdentificacion,
    string  NumeroIdentificacion,
    string  NombresCompletos,
    int     EdadAnios,
    char    Sexo,
    string? Celular,
    string? Email,
    string? Aseguradora,
    string? Regimen         // ← NUEVO: nombre del régimen
);

// ── Paciente completo ─────────────────────────────────────────
public record PacienteDto(
    int      Id,
    string   TipoIdentificacion,
    string   NumeroIdentificacion,
    string   NombresCompletos,
    DateOnly FechaNacimiento,
    int      EdadAnios,
    char     Sexo,
    string?  Celular,
    string?  Email,
    string?  Whatsapp,
    int?     AseguradoraId,
    string?  Aseguradora,
    string?  CodigoAseguradora,   // ← NUEVO: EPS001, CCF002…
    byte?    TipoUsuarioId,
    string?  Regimen,             // ← NUEVO: nombre del régimen
    string?  Empresa,
    bool     Activo,
    DateTime FechaCreacion
);

// ── Lista paginada de pacientes ───────────────────────────────
public record PacienteListaDto(
    List<PacienteDto> Items,
    int Total,
    int Pagina,
    int TamPagina,
    int TotalPaginas
);

// ── Profesional resumen ───────────────────────────────────────
public record ProfesionalResumenDto(
    int     Id,
    string  NombresCompletos,
    string  Especialidad,
    string  Sede,
    string? ConsultorioSala
);

// ── Tipo de cita ──────────────────────────────────────────────
public record TipoCitaDto(
    int    Id,
    string Nombre,
    string Categoria,
    int    DuracionMinutos,
    bool   RequiereValidacion
);

// ── Historial de estado ───────────────────────────────────────
public record HistorialEstadoDto(
    int      Id,
    string?  EstadoAnterior,
    string   EstadoNuevo,
    string?  Motivo,
    string   CambiadoPor,
    DateTime FechaCambio,
    string   Origen
);

// ── Aseguradora resumen (para citas y pacientes) ──────────────
public record AseguradoraResumenDto(
    int    Id,
    string Codigo,
    string Sigla,
    string Nombre,
    string TipoEntidad
);

// ── Aseguradora completa (para catálogo) ──────────────────────
public record AseguradoraDto(
    int     Id,
    byte    TipoEntidadId,
    string  TipoEntidad,
    string  Codigo,
    string  Sigla,
    string  Nombre,
    string? Gerente,
    string? CodigoMunicipio,
    string? Municipio,
    string? Departamento,
    string? Direccion,
    string? Telefono,
    string? Email,
    string? Url,
    bool    Activo
);

// ── TipoEntidad ───────────────────────────────────────────────
public record TipoEntidadDto(
    byte    Id,
    string  Codigo,
    string  Nombre,
    string? OtroNombre
);

// ── TipoUsuario (régimen) ─────────────────────────────────────
public record TipoUsuarioDto(
    byte   Id,
    string Codigo,
    string Nombre
);

// ── Departamento ──────────────────────────────────────────────
public record DepartamentoDto(
    string CodigoDane,
    string Nombre
);

// ── Municipio ─────────────────────────────────────────────────
public record MunicipioDto(
    string  CodigoDane,
    string  CodigoDepartamento,
    string  Nombre,
    string  Tipo,
    decimal? Longitud,
    decimal? Latitud
);

// ── Catálogos simples (sin cambios) ───────────────────────────
public record EspecialidadDto(int Id, string Nombre, string? Descripcion);
public record SedeDto(int Id, string Nombre, string? Direccion, string? Ciudad);
public record TipoIdentificacionDto(int Id, string Codigo, string Nombre);
public record PaginadoDto<T>(List<T> Items, int Total, int Pagina, int TamPagina, int TotalPaginas);
