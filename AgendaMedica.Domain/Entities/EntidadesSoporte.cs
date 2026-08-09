// ============================================================
//  AGENDA MÉDICA — ENTIDADES DE SOPORTE
//  Proyecto : AgendaMedica.Domain / Entities
// ============================================================
//  HistorialEstadoCita  → auditoría inmutable de cambios de estado
//  OutboxMensaje        → cola de sincronización con Teams
//  NotificacionLog      → registro de notificaciones al paciente
// ============================================================

using AgendaMedica.Domain.Exceptions;

namespace AgendaMedica.Domain.Entities;

// ── HistorialEstadoCita ───────────────────────────────────────
/// <summary>
/// Registro inmutable de cada cambio de estado de una cita.
/// Proporciona trazabilidad completa exigida en entornos clínicos.
/// Una vez creado, ningún campo puede ser modificado.
/// </summary>
public class HistorialEstadoCita
{
    public int     Id              { get; private set; }
    public int     CitaId          { get; private set; }
    public byte?   EstadoAnteriorId { get; private set; }
    public byte    EstadoNuevoId   { get; private set; }
    public string? Motivo          { get; private set; }
    public string  CambiadoPor     { get; private set; } = string.Empty;
    public DateTime FechaCambio    { get; private set; } = DateTime.UtcNow;
    public string  Origen          { get; private set; } = "App";  // App / Teams / Sistema

    // Navegación
    public Cita? Cita { get; private set; }

    protected HistorialEstadoCita() { }

    /// <summary>
    /// Crea un registro de historial. Solo debe llamarse desde Cita.
    /// </summary>
    internal HistorialEstadoCita(
        byte?   estadoAnteriorId,
        byte    estadoNuevoId,
        string? motivo,
        string  cambiadoPor,
        string  origen)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(cambiadoPor, nameof(cambiadoPor));

        EstadoAnteriorId = estadoAnteriorId;
        EstadoNuevoId    = estadoNuevoId;
        Motivo           = motivo?.Trim();
        CambiadoPor      = cambiadoPor.Trim();
        Origen           = origen;
        FechaCambio      = DateTime.UtcNow;
    }
}

// ── OutboxMensaje ─────────────────────────────────────────────
/// <summary>
/// Mensaje pendiente de sincronización con Microsoft Teams.
/// Implementa el patrón Outbox: primero se guarda en BD junto
/// con la cita (misma transacción), luego el OutboxProcessor
/// lo envía a Graph API de forma asíncrona con reintentos.
/// </summary>
public class OutboxMensaje
{
    public int       Id             { get; private set; }
    public int       CitaId         { get; private set; }
    public string    TipoOperacion  { get; private set; } = string.Empty;  // CrearEvento / ActualizarEvento / CancelarEvento
    public string    Payload        { get; private set; } = "{}";          // JSON con datos del evento
    public bool      Procesado      { get; private set; } = false;
    public byte      Intentos       { get; private set; } = 0;
    public DateTime? UltimoIntento  { get; private set; }
    public string?   Error          { get; private set; }
    public DateTime  FechaCreacion  { get; private set; } = DateTime.UtcNow;
    public DateTime? FechaProcesado { get; private set; }

    // Navegación
    public Cita? Cita { get; private set; }

    protected OutboxMensaje() { }

    /// <summary>
    /// Crea un nuevo mensaje pendiente. Solo debe llamarse desde Cita.
    /// </summary>
    internal OutboxMensaje(string tipoOperacion)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tipoOperacion, nameof(tipoOperacion));
        TipoOperacion = tipoOperacion;
    }

    /// <summary>
    /// El OutboxProcessor llama este método al intentar enviar el mensaje.
    /// Registra el intento, el resultado y el error si lo hubo.
    /// </summary>
    public void RegistrarIntento(string? error = null)
    {
        Intentos++;
        UltimoIntento = DateTime.UtcNow;
        Error         = error;

        if (error is null)
        {
            Procesado      = true;
            FechaProcesado = DateTime.UtcNow;
        }
    }

    /// <summary>
    /// Almacena el payload JSON que se enviará a Graph API.
    /// Lo llena el OutboxProcessor antes de enviar.
    /// </summary>
    public void EstablecerPayload(string payloadJson)
    {
        if (string.IsNullOrWhiteSpace(payloadJson))
            throw new DomainException("El payload del mensaje Outbox no puede estar vacío.");
        Payload = payloadJson;
    }

    /// <summary>
    /// Indica si el mensaje puede reintentarse (menos de 5 intentos y no procesado).
    /// </summary>
    public bool PuedeReintentar => !Procesado && Intentos < 5;
}

// ── NotificacionLog ───────────────────────────────────────────
/// <summary>
/// Registro de cada notificación enviada o intentada al paciente.
/// Canal: Email, SMS, WhatsApp, Teams.
/// </summary>
public class NotificacionLog
{
    public int       Id           { get; private set; }
    public int       CitaId       { get; private set; }
    public string    Canal        { get; private set; } = string.Empty;   // Email / SMS / WhatsApp / Teams
    public string    Destinatario { get; private set; } = string.Empty;   // Email o número
    public string    TipoEvento   { get; private set; } = string.Empty;   // Confirmacion / Recordatorio / Cancelacion
    public string    Estado       { get; private set; } = "Pendiente";    // Pendiente / Enviado / Error
    public byte      Intentos     { get; private set; } = 0;
    public DateTime? UltimoIntento { get; private set; }
    public string?   Error        { get; private set; }
    public DateTime  FechaCreacion { get; private set; } = DateTime.UtcNow;

    // Navegación
    public Cita? Cita { get; private set; }

    protected NotificacionLog() { }

    public NotificacionLog(int citaId, string canal, string destinatario, string tipoEvento)
    {
        if (citaId <= 0)
            throw new DomainException("La cita es requerida para la notificación.");
        ArgumentException.ThrowIfNullOrWhiteSpace(canal,        nameof(canal));
        ArgumentException.ThrowIfNullOrWhiteSpace(destinatario, nameof(destinatario));
        ArgumentException.ThrowIfNullOrWhiteSpace(tipoEvento,   nameof(tipoEvento));

        CitaId       = citaId;
        Canal        = canal;
        Destinatario = destinatario.Trim();
        TipoEvento   = tipoEvento;
    }

    /// <summary>
    /// Registra el resultado del intento de envío.
    /// </summary>
    public void RegistrarEnvio(bool exitoso, string? error = null)
    {
        Intentos++;
        UltimoIntento = DateTime.UtcNow;

        if (exitoso)
        {
            Estado = "Enviado";
            Error  = null;
        }
        else
        {
            Estado = "Error";
            Error  = error?.Trim();
        }
    }

    public bool PuedeReintentar => Estado != "Enviado" && Intentos < 3;
}
