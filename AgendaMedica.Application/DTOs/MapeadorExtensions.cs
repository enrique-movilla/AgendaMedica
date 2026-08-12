// ============================================================
//  AGENDA MÉDICA — MAPEADOR DE EXTENSIONES (v1.1)
//  Proyecto : AgendaMedica.Application / DTOs
//  Archivo  : MapeadorExtensions.cs  (reemplaza v1.0)
// ============================================================

using AgendaMedica.Application.DTOs;
using AgendaMedica.Domain.Entities;

namespace AgendaMedica.Application.DTOs;

public static class MapeadorExtensions
{
    // ── Cita → CitaDto ────────────────────────────────────────
    public static CitaDto ToDto(this Cita cita) => new(
        Id:               cita.Id,
        FechaHora:        cita.FechaHora,
        FechaHoraFin:     cita.FechaHoraFin,
        DuracionMinutos:  cita.DuracionMinutos,
        Estado:           cita.Estado.ToString(),
        EstadoId:         cita.EstadoCitaId,
        TipoCita:         cita.TipoCita!.ToDto(),
        Paciente:         cita.Paciente!.ToResumenDto(),
        Profesional:      cita.Profesional!.ToResumenDto(),
        Aseguradora:      cita.Aseguradora?.ToResumenDto(),
        TipoUsuario:      cita.TipoUsuario?.ToDto(),
        MotivoConsulta:   cita.MotivoConsulta,
        Observaciones:    cita.Observaciones,
        TeamsEventId:     cita.TeamsEventId,
        TeamsJoinUrl:     cita.TeamsJoinUrl,
        CreadoPor:        cita.CreadoPor,
        FechaCreacion:    cita.FechaCreacion,
        FechaModificacion:cita.FechaModificacion
    );

    // Sobrecarga cuando las entidades vienen por separado
    public static CitaDto ToDto(
        this Cita cita, Paciente paciente,
        Profesional profesional, TipoCita tipoCita,
        Aseguradora? aseguradora = null,
        TipoUsuario? tipoUsuario = null) => new(
        Id:               cita.Id,
        FechaHora:        cita.FechaHora,
        FechaHoraFin:     cita.FechaHoraFin,
        DuracionMinutos:  cita.DuracionMinutos,
        Estado:           cita.Estado.ToString(),
        EstadoId:         cita.EstadoCitaId,
        TipoCita:         tipoCita.ToDto(),
        Paciente:         paciente.ToResumenDto(),
        Profesional:      profesional.ToResumenDto(),
        Aseguradora:      aseguradora?.ToResumenDto(),
        TipoUsuario:      tipoUsuario?.ToDto(),
        MotivoConsulta:   cita.MotivoConsulta,
        Observaciones:    cita.Observaciones,
        TeamsEventId:     cita.TeamsEventId,
        TeamsJoinUrl:     cita.TeamsJoinUrl,
        CreadoPor:        cita.CreadoPor,
        FechaCreacion:    cita.FechaCreacion,
        FechaModificacion:cita.FechaModificacion
    );

    // ── Paciente → PacienteResumenDto ─────────────────────────
    public static PacienteResumenDto ToResumenDto(this Paciente p) => new(
        Id:                   p.Id,
        TipoIdentificacion:   p.TipoIdentificacion?.Codigo ?? string.Empty,
        NumeroIdentificacion: p.NumeroIdentificacion,
        NombresCompletos:     p.NombresCompletos,
        EdadAnios:            p.EdadAnios,
        Sexo:                 p.Sexo,
        Celular:              p.Celular,
        Email:                p.Email,
        Aseguradora:          p.Aseguradora?.Sigla,
        Regimen:              p.TipoUsuario?.Nombre
    );

    // ── Paciente → PacienteDto (completo) ─────────────────────
    public static PacienteDto ToPacienteDto(this Paciente p) => new(
        Id:                   p.Id,
        TipoIdentificacion:   p.TipoIdentificacion?.Codigo ?? string.Empty,
        NumeroIdentificacion: p.NumeroIdentificacion,
        NombresCompletos:     p.NombresCompletos,
        FechaNacimiento:      p.FechaNacimiento,
        EdadAnios:            p.EdadAnios,
        Sexo:                 p.Sexo,
        Celular:              p.Celular,
        Email:                p.Email,
        Whatsapp:             p.Whatsapp,
        AseguradoraId:        p.AseguradoraId,
        Aseguradora:          p.Aseguradora?.Nombre,
        CodigoAseguradora:    p.Aseguradora?.Codigo,
        TipoUsuarioId:        p.TipoUsuarioId,
        Regimen:              p.TipoUsuario?.Nombre,
        Empresa:              p.Empresa,
        Activo:               p.Activo,
        FechaCreacion:        p.FechaCreacion
    );

    // ── Profesional → ProfesionalResumenDto ───────────────────
    public static ProfesionalResumenDto ToResumenDto(this Profesional p) => new(
        Id:                p.Id,
        NombresCompletos:  p.NombresCompletos,
        Especialidad:      p.Especialidad?.Nombre ?? string.Empty,
        Sede:              p.Sede?.Nombre         ?? string.Empty,
        ConsultorioSala:   p.ConsultorioSala,
        EspecialidadId:    p.EspecialidadId,
        SedeId:            p.SedeId,
        TipoIdentificacion: p.TipoIdentificacion?.Nombre ?? string.Empty,
        NumeroIdentificacion: p.NumeroIdentificacion,
        Celular:           p.Celular,
        Email:             p.Email,
        RegistroMedico:    p.RegistroMedico,
        Activo:            p.Activo
    );

    // ── TipoCita → TipoCitaDto ────────────────────────────────
    public static TipoCitaDto ToDto(this TipoCita tc) => new(
        Id:                 tc.Id,
        Nombre:             tc.Nombre,
        Categoria:          tc.Categoria,
        DuracionMinutos:    tc.DuracionMinutos,
        RequiereValidacion: tc.RequiereValidacion
    );

    // ── Aseguradora → AseguradoraResumenDto ───────────────────
    public static AseguradoraResumenDto ToResumenDto(this Aseguradora a) => new(
        Id:         a.Id,
        Codigo:     a.Codigo,
        Sigla:      a.Sigla,
        Nombre:     a.Nombre,
        TipoEntidad:a.TipoEntidad?.Codigo ?? string.Empty
    );

    // ── Aseguradora → AseguradoraDto (completa) ───────────────
    public static AseguradoraDto ToDto(this Aseguradora a) => new(
        Id:              a.Id,
        TipoEntidadId:   a.TipoEntidadId,
        TipoEntidad:     a.TipoEntidad?.Nombre ?? string.Empty,
        Codigo:          a.Codigo,
        Sigla:           a.Sigla,
        Nombre:          a.Nombre,
        Gerente:         a.Gerente,
        CodigoMunicipio: a.CodigoMunicipio,
        Municipio:       a.Municipio?.Nombre,
        Departamento:    a.Municipio?.Departamento?.Nombre,
        Direccion:       a.Direccion,
        Telefono:        a.Telefono,
        Email:           a.Email,
        Url:             a.Url,
        Activo:          a.Activo
    );

    // ── TipoUsuario → TipoUsuarioDto ──────────────────────────
    public static TipoUsuarioDto ToDto(this TipoUsuario t) => new(
        Id:     t.Id,
        Codigo: t.Codigo,
        Nombre: t.Nombre
    );

    // ── TipoEntidad → TipoEntidadDto ──────────────────────────
    public static TipoEntidadDto ToDto(this TipoEntidad t) => new(
        Id:         t.Id,
        Codigo:     t.Codigo,
        Nombre:     t.Nombre,
        OtroNombre: t.OtroNombre
    );

    // ── Departamento / Municipio ──────────────────────────────
    public static DepartamentoDto ToDto(this Departamento d) => new(d.CodigoDane, d.Nombre);

    public static MunicipioDto ToDto(this Municipio m) => new(
        CodigoDane:          m.CodigoDane,
        CodigoDepartamento:  m.CodigoDepartamento,
        Nombre:              m.Nombre,
        Tipo:                m.Tipo,
        Longitud:            m.Longitud,
        Latitud:             m.Latitud
    );

    // ── DisponibilidadProfesional → DisponibilidadProfesionalDto ──
    private static readonly string[] _nombresDia =
    {
        "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"
    };

    public static DisponibilidadProfesionalDto ToDisponibilidadDto(
        this DisponibilidadProfesional d) => new(
        Id:                 d.Id,
        ProfesionalId:      d.ProfesionalId,
        NombreProfesional:  d.Profesional?.NombresCompletos ?? string.Empty,
        DiaSemana:          (byte)d.DiaSemana,
        NombreDia:          d.DiaSemana is >= Domain.Enums.DiaSemana.Lunes and <= Domain.Enums.DiaSemana.Domingo
                                ? _nombresDia[(byte)d.DiaSemana - 1]
                                : string.Empty,
        HoraInicio:         d.HoraInicio.ToString(@"hh\:mm"),
        HoraFin:            d.HoraFin.ToString(@"hh\:mm"),
        DuracionMinutos:    d.DuracionMinutos,
SedeId:             d.SedeId,
        Sede:               d.Profesional?.Sede?.Nombre,
        ConsultorioSala:    d.ConsultorioSala,
        Activo:             d.Activo
    );

    // ── BloqueoAgenda → BloqueoAgendaDto ──
    public static BloqueoAgendaDto ToBloqueoAgendaDto(
        this BloqueoAgenda b) => new(
        Id:                 b.Id,
        ProfesionalId:      b.ProfesionalId,
        NombreProfesional:  b.Profesional?.NombresCompletos ?? string.Empty,
        FechaDesde:         b.FechaDesde.ToString("yyyy-MM-dd"),
        FechaHasta:         b.FechaHasta.ToString("yyyy-MM-dd"),
        HoraInicio:         b.HoraInicio?.ToString(@"hh\:mm"),
        HoraFin:            b.HoraFin?.ToString(@"hh\:mm"),
        Motivo:             b.Motivo,
        Activo:             b.Activo
    );

    // ── ExcepcionHoraria → ExcepcionHorariaDto ──
    public static ExcepcionHorariaDto ToExcepcionHorariaDto(
        this ExcepcionHoraria e) => new(
        Id:                 e.Id,
        ProfesionalId:      e.ProfesionalId,
        NombreProfesional:  e.Profesional?.NombresCompletos ?? string.Empty,
        Fecha:              e.Fecha.ToString("yyyy-MM-dd"),
        HoraInicio:         e.HoraInicio.ToString(@"hh\:mm"),
        HoraFin:            e.HoraFin.ToString(@"hh\:mm"),
        Activo:             e.Activo
    );
}
