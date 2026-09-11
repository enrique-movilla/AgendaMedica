using AgendaMedica.Domain.Entities;
using AgendaMedica.Domain.Enums;
using AgendaMedica.Domain.Interfaces;
using MediatR;

// ═══════════════════════════════════════════════════════════════
//  SEED TODAS LAS VERTICALES DE UN TIRA (para inicialización)
// ═══════════════════════════════════════════════════════════════
public record SeedTodasVerticalesCommand(int TenantId) : IRequest<int>;

public class SeedTodasVerticalesHandler : IRequestHandler<SeedTodasVerticalesCommand, int>
{
    private readonly IUnitOfWork _uow;
    public SeedTodasVerticalesHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<int> Handle(
        SeedTodasVerticalesCommand request, CancellationToken ct)
    {
        var verticales = new[] { "default", "salud", "belleza", "servicios", "taller" };
        int totalCreados = 0;

        foreach (var vertical in verticales)
        {
            var valoresPorDefecto = ObtenerValoresPorVertical(vertical);
            foreach (var (clave, valor, categoria) in valoresPorDefecto)
            {
                var existe = await _uow.CatalogoTerminos.ObtenerPorTenantVerticalYClaveAsync(
                    request.TenantId, vertical, clave, ct);
                if (existe is null)
                {
                    var entidad = new CatalogoTermino(request.TenantId, vertical, clave, valor, categoria);
                    await _uow.CatalogoTerminos.AgregarAsync(entidad, ct);
                    totalCreados++;
                }
            }
        }

        await _uow.GuardarAsync(ct);
        return totalCreados;
    }

    private static List<(ClaveTermino Clave, string Valor, string Categoria)> ObtenerValoresPorVertical(string vertical)
        => vertical.ToLowerInvariant() switch
        {
            "salud" => new()
            {
                (ClaveTermino.NombreAplicacion, "Sincora", "Identidad"),
                (ClaveTermino.LemaPrincipal, "Recursos, tiempo y reservas en sincronía", "Identidad"),
                (ClaveTermino.DescripcionBreve, "Plataforma para administrar disponibilidad y asignar recursos", "Identidad"),
                (ClaveTermino.MensajeComercial, "Convierte disponibilidad en operaciones organizadas", "Identidad"),
                (ClaveTermino.CtaPrincipal, "Organiza tus recursos", "Identidad"),
                (ClaveTermino.CtaAlternativa, "Empieza a sincronizar tu operación", "Identidad"),
                (ClaveTermino.TerminoCliente, "Pacientes", "Entidades"),
                (ClaveTermino.TerminoRecurso, "Médicos", "Entidades"),
                (ClaveTermino.TerminoServicio, "Consultas", "Entidades"),
                (ClaveTermino.TerminoCita, "Citas médicas", "Entidades"),
                (ClaveTermino.TerminoHistorial, "Historia clínica", "Entidades"),
                (ClaveTermino.TerminoDisponibilidad, "Horario médico", "Entidades"),
                (ClaveTermino.AccionNuevaAsignacion, "Nueva cita médica", "Acciones"),
                (ClaveTermino.AccionVerDisponibilidad, "Ver horarios médicos", "Acciones"),
                (ClaveTermino.AccionBuscarCliente, "Buscar pacientes", "Acciones"),
                (ClaveTermino.AccionGestionarRecursos, "Gestionar médicos", "Acciones"),
                (ClaveTermino.AccionGestionarServicios, "Gestionar tipos de consulta", "Acciones"),
                (ClaveTermino.PantallaOperacionHoy, "Agenda del día", "Pantallas"),
                (ClaveTermino.PantallaCalendario, "Calendario de citas por médico", "Pantallas"),
                (ClaveTermino.PantallaDisponibilidad, "Gestión de disponibilidad", "Pantallas"),
                (ClaveTermino.PantallaCatalogoServicios, "Catálogo de consultas", "Pantallas"),
                (ClaveTermino.PantallaClientes, "Pacientes", "Pantallas"),
                (ClaveTermino.PantallaRecursos, "Profesionales", "Pantallas"),
                (ClaveTermino.MsgSeleccionarRecursos, "Seleccione los médicos a mostrar", "Mensajes"),
                (ClaveTermino.MsgSeleccionarReserva, "Seleccione una cita para ver su detalle...", "Mensajes"),
                (ClaveTermino.MsgProximaDisponibilidad, "Próximo turno disponible", "Mensajes"),
                (ClaveTermino.MsgSinDatos, "Sin citas para mostrar", "Mensajes"),
                (ClaveTermino.MsgCargando, "Cargando agenda...", "Mensajes"),
                (ClaveTermino.AgendaSub, "Calendario de citas por médico. Seleccione los médicos a mostrar.", "Mensajes"),
                (ClaveTermino.LabelProfesionales, "Médicos", "Mensajes"),
                (ClaveTermino.MsgSeleccionarProfesional, "Seleccione al menos un médico para ver el calendario.", "Mensajes"),
                (ClaveTermino.NuevaCitaSub, "Registre una cita médica para un paciente existente. La duración depende del tipo de cita.", "Mensajes"),
                (ClaveTermino.MsgSeleccionarCliente, "Seleccione el paciente de la lista antes de continuar.", "Mensajes"),
                (ClaveTermino.AccionConfirmar, "Confirmar", "Acciones"),
                (ClaveTermino.AccionIniciarAtencion, "Iniciar atención", "Acciones"),
                (ClaveTermino.AccionReprogramar, "Reprogramar", "Acciones"),
                (ClaveTermino.AccionCancelarCita, "Cancelar Cita", "Acciones"),
                (ClaveTermino.DetallePaciente, "Paciente", "Detalle"),
                (ClaveTermino.DetalleProfesional, "Profesional", "Detalle"),
                (ClaveTermino.DetalleTipoCita, "Tipo de cita", "Detalle"),
                (ClaveTermino.DetalleAseguradora, "Aseguradora", "Detalle"),
                (ClaveTermino.DetalleRegimen, "Régimen", "Detalle"),
                (ClaveTermino.DetalleMotivo, "Motivo", "Detalle"),
                (ClaveTermino.DetalleObservaciones, "Observaciones", "Detalle"),
            },
            "belleza" => new()
            {
                (ClaveTermino.NombreAplicacion, "Sincora", "Identidad"),
                (ClaveTermino.LemaPrincipal, "Recursos, tiempo y reservas en sincronía", "Identidad"),
                (ClaveTermino.DescripcionBreve, "Plataforma para administrar disponibilidad y asignar recursos", "Identidad"),
                (ClaveTermino.MensajeComercial, "Convierte disponibilidad en operaciones organizadas", "Identidad"),
                (ClaveTermino.CtaPrincipal, "Organiza tus recursos", "Identidad"),
                (ClaveTermino.CtaAlternativa, "Empieza a sincronizar tu operación", "Identidad"),
                (ClaveTermino.TerminoCliente, "Clientes", "Entidades"),
                (ClaveTermino.TerminoRecurso, "Estilistas", "Entidades"),
                (ClaveTermino.TerminoServicio, "Tratamientos", "Entidades"),
                (ClaveTermino.TerminoCita, "Turnos", "Entidades"),
                (ClaveTermino.TerminoHistorial, "Historial de servicios", "Entidades"),
                (ClaveTermino.TerminoDisponibilidad, "Disponibilidad del estilista", "Entidades"),
                (ClaveTermino.AccionNuevaAsignacion, "Nuevo turno", "Acciones"),
                (ClaveTermino.AccionVerDisponibilidad, "Ver disponibilidad", "Acciones"),
                (ClaveTermino.AccionBuscarCliente, "Buscar clientes", "Acciones"),
                (ClaveTermino.AccionGestionarRecursos, "Gestionar estilistas", "Acciones"),
                (ClaveTermino.AccionGestionarServicios, "Gestionar tratamientos", "Acciones"),
                (ClaveTermino.PantallaOperacionHoy, "Operación de hoy", "Pantallas"),
                (ClaveTermino.PantallaCalendario, "Calendario de reservas por recurso", "Pantallas"),
                (ClaveTermino.PantallaDisponibilidad, "Disponibilidad y horarios", "Pantallas"),
                (ClaveTermino.PantallaCatalogoServicios, "Servicios y categorías", "Pantallas"),
                (ClaveTermino.PantallaClientes, "Clientes", "Pantallas"),
                (ClaveTermino.PantallaRecursos, "Recursos", "Pantallas"),
                (ClaveTermino.MsgSeleccionarRecursos, "Selecciona los recursos que deseas visualizar", "Mensajes"),
                (ClaveTermino.MsgSeleccionarReserva, "Selecciona una reserva para consultar sus detalles, historial y acciones", "Mensajes"),
                (ClaveTermino.MsgProximaDisponibilidad, "Próxima disponibilidad", "Mensajes"),
                (ClaveTermino.MsgSinDatos, "Sin datos para mostrar", "Mensajes"),
                (ClaveTermino.MsgCargando, "Cargando...", "Mensajes"),
                (ClaveTermino.AgendaSub, "Calendario de turnos por estilista. Seleccione los estilistas a mostrar.", "Mensajes"),
                (ClaveTermino.LabelProfesionales, "Estilistas", "Mensajes"),
                (ClaveTermino.MsgSeleccionarProfesional, "Seleccione al menos un estilista para ver el calendario.", "Mensajes"),
                (ClaveTermino.NuevaCitaSub, "Registre un turno para un cliente existente. La duración depende del tipo de servicio.", "Mensajes"),
                (ClaveTermino.MsgSeleccionarCliente, "Seleccione el cliente de la lista antes de continuar.", "Mensajes"),
                (ClaveTermino.AccionConfirmar, "Confirmar", "Acciones"),
                (ClaveTermino.AccionIniciarAtencion, "Iniciar atención", "Acciones"),
                (ClaveTermino.AccionReprogramar, "Reprogramar", "Acciones"),
                (ClaveTermino.AccionCancelarCita, "Cancelar Cita", "Acciones"),
                (ClaveTermino.DetallePaciente, "Paciente", "Detalle"),
                (ClaveTermino.DetalleProfesional, "Profesional", "Detalle"),
                (ClaveTermino.DetalleTipoCita, "Tipo de cita", "Detalle"),
                (ClaveTermino.DetalleAseguradora, "Aseguradora", "Detalle"),
                (ClaveTermino.DetalleRegimen, "Régimen", "Detalle"),
                (ClaveTermino.DetalleMotivo, "Motivo", "Detalle"),
                (ClaveTermino.DetalleObservaciones, "Observaciones", "Detalle"),
            },
            "servicios" => new()
            {
                (ClaveTermino.NombreAplicacion, "Sincora", "Identidad"),
                (ClaveTermino.LemaPrincipal, "Recursos, tiempo y reservas en sincronía", "Identidad"),
                (ClaveTermino.DescripcionBreve, "Plataforma para administrar disponibilidad y asignar recursos", "Identidad"),
                (ClaveTermino.MensajeComercial, "Convierte disponibilidad en operaciones organizadas", "Identidad"),
                (ClaveTermino.CtaPrincipal, "Organiza tus recursos", "Identidad"),
                (ClaveTermino.CtaAlternativa, "Empieza a sincronizar tu operación", "Identidad"),
                (ClaveTermino.TerminoCliente, "Clientes", "Entidades"),
                (ClaveTermino.TerminoRecurso, "Consultores", "Entidades"),
                (ClaveTermino.TerminoServicio, "Asesorías", "Entidades"),
                (ClaveTermino.TerminoCita, "Reuniones", "Entidades"),
                (ClaveTermino.TerminoHistorial, "Historial de casos", "Entidades"),
                (ClaveTermino.TerminoDisponibilidad, "Horarios del asesor", "Entidades"),
                (ClaveTermino.AccionNuevaAsignacion, "Nueva reunión", "Acciones"),
                (ClaveTermino.AccionVerDisponibilidad, "Ver horarios", "Acciones"),
                (ClaveTermino.AccionBuscarCliente, "Buscar clientes", "Acciones"),
                (ClaveTermino.AccionGestionarRecursos, "Gestionar consultores", "Acciones"),
                (ClaveTermino.AccionGestionarServicios, "Gestionar asesorías", "Acciones"),
                (ClaveTermino.PantallaOperacionHoy, "Operación de hoy", "Pantallas"),
                (ClaveTermino.PantallaCalendario, "Calendario de reservas por recurso", "Pantallas"),
                (ClaveTermino.PantallaDisponibilidad, "Disponibilidad y horarios", "Pantallas"),
                (ClaveTermino.PantallaCatalogoServicios, "Servicios y categorías", "Pantallas"),
                (ClaveTermino.PantallaClientes, "Clientes", "Pantallas"),
                (ClaveTermino.PantallaRecursos, "Recursos", "Pantallas"),
                (ClaveTermino.MsgSeleccionarRecursos, "Selecciona los recursos que deseas visualizar", "Mensajes"),
                (ClaveTermino.MsgSeleccionarReserva, "Selecciona una reserva para consultar sus detalles, historial y acciones", "Mensajes"),
                (ClaveTermino.MsgProximaDisponibilidad, "Próxima disponibilidad", "Mensajes"),
                (ClaveTermino.MsgSinDatos, "Sin datos para mostrar", "Mensajes"),
                (ClaveTermino.MsgCargando, "Cargando...", "Mensajes"),
                (ClaveTermino.AgendaSub, "Calendario de reuniones por consultor. Seleccione los consultores a mostrar.", "Mensajes"),
                (ClaveTermino.LabelProfesionales, "Consultores", "Mensajes"),
                (ClaveTermino.MsgSeleccionarProfesional, "Seleccione al menos un consultor para ver el calendario.", "Mensajes"),
                (ClaveTermino.NuevaCitaSub, "Registre una reunión para un cliente existente. La duración depende del tipo de asesoría.", "Mensajes"),
                (ClaveTermino.MsgSeleccionarCliente, "Seleccione el cliente de la lista antes de continuar.", "Mensajes"),
                (ClaveTermino.AccionConfirmar, "Confirmar", "Acciones"),
                (ClaveTermino.AccionIniciarAtencion, "Iniciar atención", "Acciones"),
                (ClaveTermino.AccionReprogramar, "Reprogramar", "Acciones"),
                (ClaveTermino.AccionCancelarCita, "Cancelar Cita", "Acciones"),
                (ClaveTermino.DetallePaciente, "Paciente", "Detalle"),
                (ClaveTermino.DetalleProfesional, "Profesional", "Detalle"),
                (ClaveTermino.DetalleTipoCita, "Tipo de cita", "Detalle"),
                (ClaveTermino.DetalleAseguradora, "Aseguradora", "Detalle"),
                (ClaveTermino.DetalleRegimen, "Régimen", "Detalle"),
                (ClaveTermino.DetalleMotivo, "Motivo", "Detalle"),
                (ClaveTermino.DetalleObservaciones, "Observaciones", "Detalle"),
            },
            "taller" => new()
            {
                (ClaveTermino.NombreAplicacion, "Sincora", "Identidad"),
                (ClaveTermino.LemaPrincipal, "Recursos, tiempo y reservas en sincronía", "Identidad"),
                (ClaveTermino.DescripcionBreve, "Plataforma para administrar disponibilidad y asignar recursos", "Identidad"),
                (ClaveTermino.MensajeComercial, "Convierte disponibilidad en operaciones organizadas", "Identidad"),
                (ClaveTermino.CtaPrincipal, "Organiza tus recursos", "Identidad"),
                (ClaveTermino.CtaAlternativa, "Empieza a sincronizar tu operación", "Identidad"),
                (ClaveTermino.TerminoCliente, "Clientes", "Entidades"),
                (ClaveTermino.TerminoRecurso, "Técnicos", "Entidades"),
                (ClaveTermino.TerminoServicio, "Reparaciones", "Entidades"),
                (ClaveTermino.TerminoCita, "Órdenes", "Entidades"),
                (ClaveTermino.TerminoHistorial, "Historial de reparaciones", "Entidades"),
                (ClaveTermino.TerminoDisponibilidad, "Turnos del técnico", "Entidades"),
                (ClaveTermino.AccionNuevaAsignacion, "Nueva orden", "Acciones"),
                (ClaveTermino.AccionVerDisponibilidad, "Ver turnos", "Acciones"),
                (ClaveTermino.AccionBuscarCliente, "Buscar clientes", "Acciones"),
                (ClaveTermino.AccionGestionarRecursos, "Gestionar técnicos", "Acciones"),
                (ClaveTermino.AccionGestionarServicios, "Gestionar reparaciones", "Acciones"),
                (ClaveTermino.PantallaOperacionHoy, "Operación de hoy", "Pantallas"),
                (ClaveTermino.PantallaCalendario, "Calendario de reservas por recurso", "Pantallas"),
                (ClaveTermino.PantallaDisponibilidad, "Disponibilidad y horarios", "Pantallas"),
                (ClaveTermino.PantallaCatalogoServicios, "Servicios y categorías", "Pantallas"),
                (ClaveTermino.PantallaClientes, "Clientes", "Pantallas"),
                (ClaveTermino.PantallaRecursos, "Recursos", "Pantallas"),
                (ClaveTermino.MsgSeleccionarRecursos, "Selecciona los recursos que deseas visualizar", "Mensajes"),
                (ClaveTermino.MsgSeleccionarReserva, "Selecciona una reserva para consultar sus detalles, historial y acciones", "Mensajes"),
                (ClaveTermino.MsgProximaDisponibilidad, "Próxima disponibilidad", "Mensajes"),
                (ClaveTermino.MsgSinDatos, "Sin datos para mostrar", "Mensajes"),
                (ClaveTermino.MsgCargando, "Cargando...", "Mensajes"),
                (ClaveTermino.AgendaSub, "Calendario de órdenes por técnico. Seleccione los técnicos a mostrar.", "Mensajes"),
                (ClaveTermino.LabelProfesionales, "Técnicos", "Mensajes"),
                (ClaveTermino.MsgSeleccionarProfesional, "Seleccione al menos un técnico para ver el calendario.", "Mensajes"),
                (ClaveTermino.NuevaCitaSub, "Registre una orden para un cliente existente. La duración depende del tipo de reparación.", "Mensajes"),
                (ClaveTermino.MsgSeleccionarCliente, "Seleccione el cliente de la lista antes de continuar.", "Mensajes"),
                (ClaveTermino.AccionConfirmar, "Confirmar", "Acciones"),
                (ClaveTermino.AccionIniciarAtencion, "Iniciar atención", "Acciones"),
                (ClaveTermino.AccionReprogramar, "Reprogramar", "Acciones"),
                (ClaveTermino.AccionCancelarCita, "Cancelar Cita", "Acciones"),
                (ClaveTermino.DetallePaciente, "Paciente", "Detalle"),
                (ClaveTermino.DetalleProfesional, "Profesional", "Detalle"),
                (ClaveTermino.DetalleTipoCita, "Tipo de cita", "Detalle"),
                (ClaveTermino.DetalleAseguradora, "Aseguradora", "Detalle"),
                (ClaveTermino.DetalleRegimen, "Régimen", "Detalle"),
                (ClaveTermino.DetalleMotivo, "Motivo", "Detalle"),
                (ClaveTermino.DetalleObservaciones, "Observaciones", "Detalle"),
            },
            _ => new()
            {
                (ClaveTermino.NombreAplicacion, "Sincora", "Identidad"),
                (ClaveTermino.LemaPrincipal, "Recursos, tiempo y reservas en sincronía", "Identidad"),
                (ClaveTermino.DescripcionBreve, "Plataforma para administrar disponibilidad y asignar recursos", "Identidad"),
                (ClaveTermino.MensajeComercial, "Convierte disponibilidad en operaciones organizadas", "Identidad"),
                (ClaveTermino.CtaPrincipal, "Organiza tus recursos", "Identidad"),
                (ClaveTermino.CtaAlternativa, "Empieza a sincronizar tu operación", "Identidad"),
                (ClaveTermino.TerminoCliente, "Clientes", "Entidades"),
                (ClaveTermino.TerminoRecurso, "Recursos", "Entidades"),
                (ClaveTermino.TerminoServicio, "Servicios", "Entidades"),
                (ClaveTermino.TerminoCita, "Citas", "Entidades"),
                (ClaveTermino.TerminoHistorial, "Historial", "Entidades"),
                (ClaveTermino.TerminoDisponibilidad, "Disponibilidad", "Entidades"),
                (ClaveTermino.AccionNuevaAsignacion, "Nueva asignación", "Acciones"),
                (ClaveTermino.AccionVerDisponibilidad, "Ver disponibilidad", "Acciones"),
                (ClaveTermino.AccionBuscarCliente, "Buscar clientes", "Acciones"),
                (ClaveTermino.AccionGestionarRecursos, "Gestionar recursos", "Acciones"),
                (ClaveTermino.AccionGestionarServicios, "Gestionar servicios", "Acciones"),
                (ClaveTermino.PantallaOperacionHoy, "Operación de hoy", "Pantallas"),
                (ClaveTermino.PantallaCalendario, "Calendario de reservas por recurso", "Pantallas"),
                (ClaveTermino.PantallaDisponibilidad, "Disponibilidad y horarios", "Pantallas"),
                (ClaveTermino.PantallaCatalogoServicios, "Servicios y categorías", "Pantallas"),
                (ClaveTermino.PantallaClientes, "Clientes", "Pantallas"),
                (ClaveTermino.PantallaRecursos, "Recursos", "Pantallas"),
                (ClaveTermino.MsgSeleccionarRecursos, "Selecciona los recursos que deseas visualizar", "Mensajes"),
                (ClaveTermino.MsgSeleccionarReserva, "Selecciona una reserva para consultar sus detalles, historial y acciones", "Mensajes"),
                (ClaveTermino.MsgProximaDisponibilidad, "Próxima disponibilidad", "Mensajes"),
                (ClaveTermino.MsgSinDatos, "Sin datos para mostrar", "Mensajes"),
                (ClaveTermino.MsgCargando, "Cargando...", "Mensajes"),
                (ClaveTermino.AgendaSub, "Calendario de reservas por recurso. Seleccione los recursos a mostrar.", "Mensajes"),
                (ClaveTermino.LabelProfesionales, "Recursos", "Mensajes"),
                (ClaveTermino.MsgSeleccionarProfesional, "Seleccione al menos un recurso para ver el calendario.", "Mensajes"),
                (ClaveTermino.NuevaCitaSub, "Registre una cita para un paciente existente. La duración depende del tipo de cita.", "Mensajes"),
                (ClaveTermino.MsgSeleccionarCliente, "Seleccione el cliente de la lista antes de continuar.", "Mensajes"),
                (ClaveTermino.AccionConfirmar, "Confirmar", "Acciones"),
                (ClaveTermino.AccionIniciarAtencion, "Iniciar atención", "Acciones"),
                (ClaveTermino.AccionReprogramar, "Reprogramar", "Acciones"),
                (ClaveTermino.AccionCancelarCita, "Cancelar Cita", "Acciones"),
                (ClaveTermino.DetallePaciente, "Paciente", "Detalle"),
                (ClaveTermino.DetalleProfesional, "Profesional", "Detalle"),
                (ClaveTermino.DetalleTipoCita, "Tipo de cita", "Detalle"),
                (ClaveTermino.DetalleAseguradora, "Aseguradora", "Detalle"),
                (ClaveTermino.DetalleRegimen, "Régimen", "Detalle"),
                (ClaveTermino.DetalleMotivo, "Motivo", "Detalle"),
                (ClaveTermino.DetalleObservaciones, "Observaciones", "Detalle"),
            }
        };
}