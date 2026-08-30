// ============================================================
//  AGENDA MÉDICA — OTROS COMANDOS (v1.3 corregido)
//  Proyecto : AgendaMedica.Application / Commands
// ============================================================

using AgendaMedica.Application.DTOs;
using AgendaMedica.Domain.Entities;
using AgendaMedica.Domain.Enums;
using AgendaMedica.Domain.Exceptions;
using AgendaMedica.Domain.Interfaces;   // ← INotificacionService ahora en Domain
using MediatR;
using Microsoft.Extensions.Logging;

namespace AgendaMedica.Application.Commands;

// ══════════════════════════════════════════════════════════════
//  CATÁLOGO DE TÉRMINOS PARAMÉTRICOS POR TENANT
// ══════════════════════════════════════════════════════════════
public record CrearTerminoCommand(
    int          TenantId,
    string       Vertical,
    ClaveTermino Clave,
    string       Valor,
    string       Categoria
) : IRequest<CatalogoTerminoDto>;

public class CrearTerminoHandler : IRequestHandler<CrearTerminoCommand, CatalogoTerminoDto>
{
    private readonly IUnitOfWork _uow;
    public CrearTerminoHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<CatalogoTerminoDto> Handle(
        CrearTerminoCommand request, CancellationToken ct)
    {
        var existente = await _uow.CatalogoTerminos.ObtenerPorTenantVerticalYClaveAsync(
            request.TenantId, request.Vertical, request.Clave, ct);
        if (existente is not null)
            throw new EntidadDuplicadaException("CatalogoTermino", 
                $"Tenant {request.TenantId} - Vertical {request.Vertical} - Clave {request.Clave}");

        var entidad = new CatalogoTermino(
            request.TenantId, request.Vertical, request.Clave, request.Valor, request.Categoria);

        await _uow.CatalogoTerminos.AgregarAsync(entidad, ct);
        await _uow.GuardarAsync(ct);
        return entidad.ToDto();
    }
}

public record ActualizarTerminoCommand(
    int    TenantId,
    string Vertical,
    ClaveTermino Clave,
    string Valor,
    string Categoria
) : IRequest<CatalogoTerminoDto>;

public class ActualizarTerminoHandler : IRequestHandler<ActualizarTerminoCommand, CatalogoTerminoDto>
{
    private readonly IUnitOfWork _uow;
    public ActualizarTerminoHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<CatalogoTerminoDto> Handle(
        ActualizarTerminoCommand request, CancellationToken ct)
    {
        var entidad = await _uow.CatalogoTerminos.ObtenerPorTenantVerticalYClaveAsync(
            request.TenantId, request.Vertical, request.Clave, ct)
            ?? throw new EntidadNoEncontradaException("CatalogoTermino", 
                $"Tenant {request.TenantId} - Vertical {request.Vertical} - Clave {request.Clave}");

        entidad.Actualizar(request.Valor, request.Categoria);
        _uow.CatalogoTerminos.Actualizar(entidad);
        await _uow.GuardarAsync(ct);
        return entidad.ToDto();
    }
}

public record InactivarTerminoCommand(int TenantId, string Vertical, ClaveTermino Clave) : IRequest<bool>;

public class InactivarTerminoHandler : IRequestHandler<InactivarTerminoCommand, bool>
{
    private readonly IUnitOfWork _uow;
    public InactivarTerminoHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<bool> Handle(
        InactivarTerminoCommand request, CancellationToken ct)
    {
        var entidad = await _uow.CatalogoTerminos.ObtenerPorTenantVerticalYClaveAsync(
            request.TenantId, request.Vertical, request.Clave, ct)
            ?? throw new EntidadNoEncontradaException("CatalogoTermino", 
                $"Tenant {request.TenantId} - Vertical {request.Vertical} - Clave {request.Clave}");

        entidad.Inactivar();
        _uow.CatalogoTerminos.Actualizar(entidad);
        await _uow.GuardarAsync(ct);
        return true;
    }
}

public record SeedCatalogoPorDefectoCommand(int TenantId, string Vertical) : IRequest<int>;

public class SeedCatalogoPorDefectoHandler : IRequestHandler<SeedCatalogoPorDefectoCommand, int>
{
    private readonly IUnitOfWork _uow;
    public SeedCatalogoPorDefectoHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<int> Handle(
        SeedCatalogoPorDefectoCommand request, CancellationToken ct)
    {
        var valoresPorDefecto = ObtenerValoresPorVertical(request.Vertical);
        int creados = 0;

        foreach (var (clave, valor, categoria) in valoresPorDefecto)
        {
            var existe = await _uow.CatalogoTerminos.ObtenerPorTenantVerticalYClaveAsync(
                request.TenantId, request.Vertical, clave, ct);
            if (existe is null)
            {
                var entidad = new CatalogoTermino(request.TenantId, request.Vertical, clave, valor, categoria);
                await _uow.CatalogoTerminos.AgregarAsync(entidad, ct);
                creados++;
            }
        }

        await _uow.GuardarAsync(ct);
        return creados;
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
            "default" => new()
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

// ══════════════════════════════════════════════════════════════
//  CANCELAR CITA
// ══════════════════════════════════════════════════════════════
public record CancelarCitaCommand(
    int    CitaId,
    string Motivo,
    string CambiadoPor,
    string Origen = "App"
) : IRequest<CitaDto>;

public class CancelarCitaHandler : IRequestHandler<CancelarCitaCommand, CitaDto>
{
    private readonly IUnitOfWork          _uow;
    private readonly INotificacionService _notificaciones;
    private readonly ILogger<CancelarCitaHandler> _logger;

    public CancelarCitaHandler(
        IUnitOfWork uow,
        INotificacionService notif,
        ILogger<CancelarCitaHandler> logger)
    {
        _uow            = uow;
        _notificaciones = notif;
        _logger         = logger;
    }

    public async Task<CitaDto> Handle(
        CancelarCitaCommand request, CancellationToken ct)
    {
        var cita = await _uow.Citas.ObtenerPorIdAsync(request.CitaId, ct)
            ?? throw new EntidadNoEncontradaException("Cita", request.CitaId);

        var origenEnum = Enum.Parse<OrigenCambio>(request.Origen, ignoreCase: true);
        cita.Cancelar(request.Motivo, request.CambiadoPor, origenEnum);

        _uow.Citas.Actualizar(cita);
        await _uow.GuardarAsync(ct);

        if (cita.Paciente is not null)
        {
            try { await _notificaciones.NotificarCancelacionCitaAsync(cita, request.Motivo, ct); }
            catch (Exception ex) { _logger.LogWarning(ex, "Notif cancelación falló cita {Id}", cita.Id); }
        }

        return cita.ToDto();
    }
}

// ══════════════════════════════════════════════════════════════
//  MODIFICAR CITA
// ══════════════════════════════════════════════════════════════
public record ModificarCitaCommand(
    int       CitaId,
    DateTime? NuevaFechaHora,
    string?   Observaciones,
    string    Motivo,
    string    ModificadoPor
) : IRequest<CitaDto>;

public class ModificarCitaHandler : IRequestHandler<ModificarCitaCommand, CitaDto>
{
    private readonly IUnitOfWork          _uow;
    private readonly INotificacionService _notificaciones;
    private readonly ILogger<ModificarCitaHandler> _logger;

    public ModificarCitaHandler(
        IUnitOfWork uow,
        INotificacionService notif,
        ILogger<ModificarCitaHandler> logger)
    {
        _uow            = uow;
        _notificaciones = notif;
        _logger         = logger;
    }

    public async Task<CitaDto> Handle(
        ModificarCitaCommand request, CancellationToken ct)
    {
        var cita = await _uow.Citas.ObtenerPorIdAsync(request.CitaId, ct)
            ?? throw new EntidadNoEncontradaException("Cita", request.CitaId);

        var reprogramada = false;

        if (request.NuevaFechaHora.HasValue)
        {
            var tipoCita = await _uow.TiposCita.ObtenerPorIdAsync(cita.TipoCitaId, ct)
                ?? throw new EntidadNoEncontradaException("TipoCita", cita.TipoCitaId);

            var nuevaFin = request.NuevaFechaHora.Value.AddMinutes(tipoCita.DuracionMinutos);

            cita.Reprogramar(request.NuevaFechaHora.Value,
                tipoCita.DuracionMinutos, request.Motivo, request.ModificadoPor);
            reprogramada = true;

            // Validación ATOMICA de traslape: advisory lock en BD.
            var ok = await _uow.Citas.ModificarCitaAtomicoAsync(
                cita, request.NuevaFechaHora.Value, nuevaFin, ct);

            if (!ok)
                throw new ConflictoHorarioException(request.NuevaFechaHora.Value, nuevaFin);
        }

        if (request.Observaciones is not null)
        {
            cita.ActualizarObservaciones(request.Observaciones, request.ModificadoPor);
            await _uow.GuardarAsync(ct);
        }
        else if (!reprogramada)
        {
            await _uow.GuardarAsync(ct);
        }

        if (reprogramada && cita.Paciente is not null)
        {
            try { await _notificaciones.NotificarReprogramacionCitaAsync(cita, ct); }
            catch (Exception ex) { _logger.LogWarning(ex, "Notif reprog falló cita {Id}", cita.Id); }
        }

        return cita.ToDto();
    }
}

// ══════════════════════════════════════════════════════════════
//  CAMBIAR ESTADO DE CITA
// ══════════════════════════════════════════════════════════════
public record CambiarEstadoCitaCommand(
    int     CitaId,
    byte    NuevoEstadoId,
    string? Motivo,
    string  CambiadoPor,
    string  Origen = "App"
) : IRequest<CitaDto>;

public class CambiarEstadoCitaHandler
    : IRequestHandler<CambiarEstadoCitaCommand, CitaDto>
{
    private readonly IUnitOfWork          _uow;
    private readonly INotificacionService _notificaciones;
    private readonly ILogger<CambiarEstadoCitaHandler> _logger;

    public CambiarEstadoCitaHandler(
        IUnitOfWork uow,
        INotificacionService notif,
        ILogger<CambiarEstadoCitaHandler> logger)
    {
        _uow            = uow;
        _notificaciones = notif;
        _logger         = logger;
    }

    public async Task<CitaDto> Handle(
        CambiarEstadoCitaCommand request, CancellationToken ct)
    {
        var cita = await _uow.Citas.ObtenerPorIdAsync(request.CitaId, ct)
            ?? throw new EntidadNoEncontradaException("Cita", request.CitaId);

        var nuevoEstado = (EstadoCita)request.NuevoEstadoId;
        var origenEnum  = Enum.Parse<OrigenCambio>(request.Origen, ignoreCase: true);

        switch (nuevoEstado)
        {
            case EstadoCita.Confirmada:
                cita.Confirmar(request.CambiadoPor, origenEnum); break;
            case EstadoCita.EnAtencion:
                cita.IniciarAtencion(request.CambiadoPor); break;
            case EstadoCita.Realizada:
                cita.MarcarRealizada(request.CambiadoPor); break;
            case EstadoCita.NoAsistio:
                cita.MarcarNoAsistio(request.CambiadoPor); break;
            case EstadoCita.Cancelada:
                cita.Cancelar(request.Motivo ?? "Cancelada por el sistema",
                    request.CambiadoPor, origenEnum); break;
            default:
                throw new DomainException(
                    $"Use el comando específico para el estado '{nuevoEstado}'.");
        }

        _uow.Citas.Actualizar(cita);
        await _uow.GuardarAsync(ct);

        if (cita.Paciente is not null)
        {
            try
            {
                switch (nuevoEstado)
                {
                    case EstadoCita.Confirmada:
                        await _notificaciones.NotificarConfirmacionCitaAsync(cita, ct); break;
                    case EstadoCita.Cancelada:
                        await _notificaciones.NotificarCancelacionCitaAsync(
                            cita, request.Motivo ?? string.Empty, ct); break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Notif estado falló cita {Id}", cita.Id);
            }
        }

        return cita.ToDto();
    }
}

// ══════════════════════════════════════════════════════════════
//  DISPONIBILIDAD PROFESIONAL (plantillas horarias) — Fase 1
// ══════════════════════════════════════════════════════════════
public record CrearDisponibilidadCommand(
    int      ProfesionalId,
    byte     DiaSemana,
    string   HoraInicio,
    string   HoraFin,
    short    DuracionMinutos,
    int?     SedeId,
    string?  ConsultorioSala
) : IRequest<DisponibilidadProfesionalDto>;

public class CrearDisponibilidadHandler
    : IRequestHandler<CrearDisponibilidadCommand, DisponibilidadProfesionalDto>
{
    private readonly IUnitOfWork _uow;
    public CrearDisponibilidadHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<DisponibilidadProfesionalDto> Handle(
        CrearDisponibilidadCommand request, CancellationToken ct)
    {
        if (request.DiaSemana is < 1 or > 7)
            throw new DomainException("El día de la semana debe estar entre 1 (lunes) y 7 (domingo).");

        var profesional = await _uow.Profesionales.ObtenerPorIdAsync(request.ProfesionalId, ct)
            ?? throw new EntidadNoEncontradaException("Profesional", request.ProfesionalId);

        var entidad = new DisponibilidadProfesional(
            profesionalId: request.ProfesionalId,
            d: (DiaSemana)request.DiaSemana,
            horaInicio: TimeOnly.Parse(request.HoraInicio),
            horaFin: TimeOnly.Parse(request.HoraFin),
            duracionMinutos: request.DuracionMinutos,
            sedeId: request.SedeId,
            consultorioSala: request.ConsultorioSala);

        await _uow.Disponibilidades.AgregarAsync(entidad, ct);
        await _uow.GuardarAsync(ct);
        return entidad.ToDisponibilidadDto();
    }
}

public record ActualizarDisponibilidadCommand(
    int      Id,
    byte     DiaSemana,
    string   HoraInicio,
    string   HoraFin,
    short    DuracionMinutos,
    int?     SedeId,
    string?  ConsultorioSala
) : IRequest<DisponibilidadProfesionalDto>;

public class ActualizarDisponibilidadHandler
    : IRequestHandler<ActualizarDisponibilidadCommand, DisponibilidadProfesionalDto>
{
    private readonly IUnitOfWork _uow;
    public ActualizarDisponibilidadHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<DisponibilidadProfesionalDto> Handle(
        ActualizarDisponibilidadCommand request, CancellationToken ct)
    {
        if (request.DiaSemana is < 1 or > 7)
            throw new DomainException("El día de la semana debe estar entre 1 (lunes) y 7 (domingo).");

        var entidad = await _uow.Disponibilidades.ObtenerPorIdAsync(request.Id, ct)
            ?? throw new EntidadNoEncontradaException("DisponibilidadPeriodo", request.Id);

        entidad.Actualizar(
            d: (DiaSemana)request.DiaSemana,
            horaInicio: TimeOnly.Parse(request.HoraInicio),
            horaFin: TimeOnly.Parse(request.HoraFin),
            duracionMinutos: request.DuracionMinutos,
            sedeId: request.SedeId,
            consultorioSala: request.ConsultorioSala);

        _uow.Disponibilidades.Actualizar(entidad);
        await _uow.GuardarAsync(ct);
        return entidad.ToDisponibilidadDto();
    }
}

public record InactivarDisponibilidadCommand(int Id) : IRequest<bool>;

public class InactivarDisponibilidadHandler
    : IRequestHandler<InactivarDisponibilidadCommand, bool>
{
    private readonly IUnitOfWork _uow;
    public InactivarDisponibilidadHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<bool> Handle(
        InactivarDisponibilidadCommand request, CancellationToken ct)
    {
        var entidad = await _uow.Disponibilidades.ObtenerPorIdAsync(request.Id, ct)
            ?? throw new EntidadNoEncontradaException("DisponibilidadPeriodo", request.Id);

        entidad.Inactivar();
        _uow.Disponibilidades.Actualizar(entidad);
        await _uow.GuardarAsync(ct);
        return true;
    }
}

// ══════════════════════════════════════════════════════════════
//  BLOQUEOS DE AGENDA Y EXCEPCIONES HORARIAS (Fase 3)
// ══════════════════════════════════════════════════════════════
public record CrearBloqueoAgendaCommand(
    int       ProfesionalId,
    DateOnly  FechaDesde,
    DateOnly  FechaHasta,
    string?   HoraInicio,
    string?   HoraFin,
    string    Motivo
) : IRequest<BloqueoAgendaDto>;

public class CrearBloqueoAgendaHandler
    : IRequestHandler<CrearBloqueoAgendaCommand, BloqueoAgendaDto>
{
    private readonly IUnitOfWork _uow;
    public CrearBloqueoAgendaHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<BloqueoAgendaDto> Handle(
        CrearBloqueoAgendaCommand request, CancellationToken ct)
    {
        var profesional = await _uow.Profesionales.ObtenerPorIdAsync(request.ProfesionalId, ct)
            ?? throw new EntidadNoEncontradaException("Profesional", request.ProfesionalId);

        var entidad = new BloqueoAgenda(
            profesionalId: request.ProfesionalId,
            fechaDesde: request.FechaDesde,
            fechaHasta: request.FechaHasta,
            motivo: request.Motivo,
            horaInicio: request.HoraInicio is null
                ? null
                : TimeOnly.Parse(request.HoraInicio).ToTimeSpan(),
            horaFin: request.HoraFin is null
                ? null
                : TimeOnly.Parse(request.HoraFin).ToTimeSpan());

        await _uow.BloqueosAgenda.AgregarAsync(entidad, ct);
        await _uow.GuardarAsync(ct);
        return entidad.ToBloqueoAgendaDto();
    }
}

public record InactivarBloqueoAgendaCommand(int Id) : IRequest<bool>;

public class InactivarBloqueoAgendaHandler
    : IRequestHandler<InactivarBloqueoAgendaCommand, bool>
{
    private readonly IUnitOfWork _uow;
    public InactivarBloqueoAgendaHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<bool> Handle(
        InactivarBloqueoAgendaCommand request, CancellationToken ct)
    {
        var entidad = await _uow.BloqueosAgenda.ObtenerPorIdAsync(request.Id, ct)
            ?? throw new EntidadNoEncontradaException("BloqueoAgenda", request.Id);

        entidad.Inactivar();
        _uow.BloqueosAgenda.Actualizar(entidad);
        await _uow.GuardarAsync(ct);
        return true;
    }
}

public record CrearExcepcionHorariaCommand(
    int      ProfesionalId,
    DateOnly Fecha,
    string   HoraInicio,
    string   HoraFin
) : IRequest<ExcepcionHorariaDto>;

public class CrearExcepcionHorariaHandler
    : IRequestHandler<CrearExcepcionHorariaCommand, ExcepcionHorariaDto>
{
    private readonly IUnitOfWork _uow;
    public CrearExcepcionHorariaHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<ExcepcionHorariaDto> Handle(
        CrearExcepcionHorariaCommand request, CancellationToken ct)
    {
        var profesional = await _uow.Profesionales.ObtenerPorIdAsync(request.ProfesionalId, ct)
            ?? throw new EntidadNoEncontradaException("Profesional", request.ProfesionalId);

        var entidad = new ExcepcionHoraria(
            profesionalId: request.ProfesionalId,
            fecha: request.Fecha,
            horaInicio: TimeOnly.Parse(request.HoraInicio).ToTimeSpan(),
            horaFin: TimeOnly.Parse(request.HoraFin).ToTimeSpan());

        await _uow.ExcepcionesHorarias.AgregarAsync(entidad, ct);
        await _uow.GuardarAsync(ct);
        return entidad.ToExcepcionHorariaDto();
    }
}

public record InactivarExcepcionHorariaCommand(int Id) : IRequest<bool>;

public class InactivarExcepcionHorariaHandler
    : IRequestHandler<InactivarExcepcionHorariaCommand, bool>
{
    private readonly IUnitOfWork _uow;
    public InactivarExcepcionHorariaHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<bool> Handle(
        InactivarExcepcionHorariaCommand request, CancellationToken ct)
    {
        var entidad = await _uow.ExcepcionesHorarias.ObtenerPorIdAsync(request.Id, ct)
            ?? throw new EntidadNoEncontradaException("ExcepcionHoraria", request.Id);

        entidad.Inactivar();
        _uow.ExcepcionesHorarias.Actualizar(entidad);
        await _uow.GuardarAsync(ct);
        return true;
    }
}

// ══════════════════════════════════════════════════════════════
//  BLOQUEO PREVENTIVO DE TURNOS (Fase 3)
// ══════════════════════════════════════════════════════════════
public record ReservarBloqueoCommand(
    int    ProfesionalId,
    DateOnly Fecha,
    string HoraInicio,
    string Usuario
) : IRequest<ResultadoReservaBloqueo>;

public class ReservarBloqueoHandler
    : IRequestHandler<ReservarBloqueoCommand, ResultadoReservaBloqueo>
{
    private readonly IBloqueoTurnoServicio _bloqueos;
    public ReservarBloqueoHandler(IBloqueoTurnoServicio bloqueos) => _bloqueos = bloqueos;

    public Task<ResultadoReservaBloqueo> Handle(
        ReservarBloqueoCommand request, CancellationToken ct)
        => _bloqueos.ReservarAsync(
            request.ProfesionalId, request.Fecha, request.HoraInicio,
            request.Usuario, ct);
}

public record RenovarBloqueoCommand(string BloqueoId)
    : IRequest<ResultadoReservaBloqueo>;

public class RenovarBloqueoHandler
    : IRequestHandler<RenovarBloqueoCommand, ResultadoReservaBloqueo>
{
    private readonly IBloqueoTurnoServicio _bloqueos;
    public RenovarBloqueoHandler(IBloqueoTurnoServicio bloqueos) => _bloqueos = bloqueos;

    public Task<ResultadoReservaBloqueo> Handle(
        RenovarBloqueoCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.BloqueoId))
            throw new EntidadNoEncontradaException("Bloqueo de turno", string.Empty);

        return _bloqueos.RenovarAsync(request.BloqueoId, ct);
    }
}

public record LiberarBloqueoCommand(string BloqueoId) : IRequest<bool>;

public class LiberarBloqueoHandler
    : IRequestHandler<LiberarBloqueoCommand, bool>
{
    private readonly IBloqueoTurnoServicio _bloqueos;
    public LiberarBloqueoHandler(IBloqueoTurnoServicio bloqueos) => _bloqueos = bloqueos;

    public Task<bool> Handle(
        LiberarBloqueoCommand request, CancellationToken ct)
        => _bloqueos.LiberarAsync(request.BloqueoId, ct);
}
