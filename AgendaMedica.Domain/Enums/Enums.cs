// ============================================================
//  AGENDA MÉDICA — ENUMERACIONES DEL DOMINIO
//  Proyecto : AgendaMedica.Domain / Enums
//  Versión  : 1.0
// ============================================================
//  Cada enum refleja exactamente los catálogos de la BD.
//  Los valores enteros (byte/int) coinciden con los Id de las
//  tablas TipoIdentificacion y EstadoCita en SQL Server.
// ============================================================

namespace AgendaMedica.Domain.Enums;

// ── Tipos de identificación (tabla dbo.TipoIdentificacion) ───
public enum TipoIdentificacion : byte
{
    CedulaCiudadania        = 1,   // CC
    TarjetaIdentidad        = 2,   // TI
    CedulaExtranjeria       = 3,   // CE
    Pasaporte               = 4,   // PA
    RegistroCivil           = 5,   // RC
    Nit                     = 6,   // NIT
    AdultoSinIdentificacion = 7,   // AS
    MenorSinIdentificacion  = 8,   // MS
}

// ── Estados de cita (tabla dbo.EstadoCita) ───────────────────
public enum EstadoCita : byte
{
    Programada    = 1,
    Confirmada    = 2,
    EnAtencion    = 3,
    Realizada     = 4,
    Cancelada     = 5,
    NoAsistio     = 6,
    Reprogramada  = 7,
}

// ── Sexo del paciente ─────────────────────────────────────────
public enum Sexo
{
    Masculino = 'M',
    Femenino  = 'F',
}

// ── Categorías de tipo de cita ────────────────────────────────
public enum CategoriaCita
{
    Consulta,
    Laboratorio,
    Radiologia,
    Odontologia,
    Fisioterapia,
    Otro,
}

// ── Canal de notificación ─────────────────────────────────────
public enum CanalNotificacion
{
    Email,
    SMS,
    WhatsApp,
    Teams,
}

// ── Estado de notificación ────────────────────────────────────
public enum EstadoNotificacion
{
    Pendiente,
    Enviado,
    Error,
}

// ── Tipo de evento para el Outbox (sincronización Teams) ──────
public enum TipoOperacionOutbox
{
    CrearEvento,
    ActualizarEvento,
    CancelarEvento,
}

// ── Origen del cambio de estado ───────────────────────────────
public enum OrigenCambio
{
    App,
    Teams,
    Sistema,
}

// ── Día de la semana (plantillas de disponibilidad) ───────────
// ISO 8601: 1 = Lunes … 7 = Domingo
public enum DiaSemana : byte
{
    Lunes    = 1,
    Martes   = 2,
    Miercoles= 3,
    Jueves   = 4,
    Viernes  = 5,
    Sabado   = 6,
    Domingo  = 7,
}
