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

// ── Claves de términos paramétricos por tenant (catálogo dinámico) ──
/// <summary>
/// Claves tipadas para el catálogo de términos (CatalogoTermino).
/// Cada tenant define su propio valor por clave.
/// </summary>
public enum ClaveTermino : byte
{
    // Identidad de la plataforma
    NombreAplicacion       = 1,
    LemaPrincipal          = 2,
    DescripcionBreve       = 3,
    MensajeComercial       = 4,
    CtaPrincipal           = 5,
    CtaAlternativa         = 6,

    // Entidades principales (lexicón UI)
    TerminoCliente         = 10,   // "Clientes" / "Pacientes"
    TerminoRecurso         = 11,   // "Recursos" / "Médicos" / "Estilistas" / "Técnicos"
    TerminoServicio        = 12,   // "Servicios" / "Consultas" / "Tratamientos" / "Reparaciones"
    TerminoCita            = 13,   // "Citas" / "Turnos" / "Órdenes" / "Reuniones"
    TerminoHistorial       = 14,   // "Historial" / "Historia clínica"
    TerminoDisponibilidad  = 15,   // "Disponibilidad" / "Horarios"

    // Acciones y navegación
    AccionNuevaAsignacion  = 20,   // "Nueva asignación" / "Nueva cita" / "Nueva orden"
    AccionVerDisponibilidad= 21,   // "Ver disponibilidad" / "Ver horarios"
    AccionBuscarCliente    = 22,   // "Buscar clientes" / "Buscar pacientes"
    AccionGestionarRecursos= 23,   // "Gestionar recursos" / "Gestionar médicos"
    AccionGestionarServicios= 24,  // "Gestionar servicios" / "Gestionar tratamientos"

    // Pantallas y secciones
    PantallaOperacionHoy   = 30,   // "Operación de hoy" / "Agenda del día"
    PantallaCalendario     = 31,   // "Calendario de reservas" / "Calendario de citas"
    PantallaDisponibilidad = 32,   // "Disponibilidad y horarios"
    PantallaCatalogoServicios = 33,// "Servicios y categorías"
    PantallaClientes       = 34,   // "Clientes" / "Pacientes"
    PantallaRecursos       = 35,   // "Recursos" / "Profesionales" / "Equipo"

    // Mensajes de estado y ayuda
    MsgSeleccionarRecursos = 40,   // "Selecciona los recursos que deseas visualizar"
    MsgSeleccionarReserva  = 41,   // "Selecciona una reserva para consultar sus detalles"
    MsgProximaDisponibilidad= 42,  // "Próxima disponibilidad"
    MsgSinDatos            = 43,   // "Sin datos para mostrar"
    MsgCargando            = 44,   // "Cargando..."
    AgendaSub              = 45,   // Subtítulo de la pantalla Agenda
    LabelProfesionales     = 46,   // Título de la sección de selección de profesionales
    MsgSeleccionarProfesional= 47, // "Seleccione al menos un profesional para ver el calendario"
    NuevaCitaSub            = 48,   // Subtítulo de la pantalla Nueva Cita

    // Notificaciones y comunicaciones (backend)
    NotifAsuntoNuevaCita   = 50,
    NotifCuerpoNuevaCita   = 51,
    NotifAsuntoRecordatorio= 52,
    NotifCuerpoRecordatorio= 53,
    NotifAsuntoCancelacion = 54,
    NotifCuerpoCancelacion = 55,
    NotifAsuntoReprogramacion= 56,
    NotifCuerpoReprogramacion= 57,

    // Teams / Outlook
    TeamsAsuntoEvento      = 60,
    TeamsCuerpoEvento      = 61,
    TeamsUbicacion         = 62,

    // PDFs y reportes
    PdfTituloReporteCitas  = 70,
    PdfTituloHistorial     = 71,
    PdfColumnaCliente      = 72,
    PdfColumnaRecurso      = 73,
    PdfColumnaServicio     = 74,
    PdfColumnaFechaHora    = 75,
    PdfColumnaEstado       = 76,
}
