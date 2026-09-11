// ============================================================
//  SINCORA — CONSTANTES COMPARTIDAS
//  Proyecto : AgendaMedica / frontend / src / lib
//  Archivo  : constants.ts
// ============================================================
//  Constantes de UI, estados de cita, días de la semana,
//  dimensiones de la timeline y claves del catálogo de términos.
// ============================================================

import type { ClaveTermino } from './types'

// ── Clases CSS compartidas ──────────────────────────────────

export const inputCls =
  'mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'

// ── Timeline — dimensiones ──────────────────────────────────

export const HORA_INICIO = 6 * 60  // 06:00 en minutos
export const HORA_FIN = 21 * 60    // 21:00 en minutos
export const PX_POR_HORA = 72      // px por hora en la escala
export const ANCHO_COL = 180       // columna izquierda (profesional/recurso)
export const ANCHO_ESCALA = ((HORA_FIN - HORA_INICIO) / 60) * PX_POR_HORA

/** Convierte minutos del día a posición X en px. */
export const pxHora = (min: number) => ((min - HORA_INICIO) / 60) * PX_POR_HORA

/** Array de horas del eje (6:00, 7:00, … 21:00). */
export const horasEje = Array.from(
  { length: (HORA_FIN - HORA_INICIO) / 60 + 1 },
  (_, i) => HORA_INICIO + i * 60,
)

// ── Estados de cita ─────────────────────────────────────────

export const ESTADOS_CITA: { id: number; nombre: string; clave: ClaveTermino }[] = [
  { id: 1, nombre: 'Programada',   clave: 'EstadoProgramada' },
  { id: 2, nombre: 'Confirmada',   clave: 'EstadoConfirmada' },
  { id: 3, nombre: 'En atención',  clave: 'EstadoEnAtencion' },
  { id: 4, nombre: 'Realizada',    clave: 'EstadoRealizada' },
  { id: 5, nombre: 'Cancelada',    clave: 'EstadoCancelada' },
  { id: 6, nombre: 'No asistió',   clave: 'EstadoNoAsistio' },
  { id: 7, nombre: 'Reprogramada', clave: 'EstadoReprogramada' },
]

// ── Días de la semana ───────────────────────────────────────

export const DIAS_SEMANA: { id: number; nombre: string; clave: ClaveTermino }[] = [
  { id: 1, nombre: 'Lunes',    clave: 'DiaLunes' },
  { id: 2, nombre: 'Martes',   clave: 'DiaMartes' },
  { id: 3, nombre: 'Miércoles', clave: 'DiaMiercoles' },
  { id: 4, nombre: 'Jueves',   clave: 'DiaJueves' },
  { id: 5, nombre: 'Viernes',  clave: 'DiaViernes' },
  { id: 6, nombre: 'Sábado',   clave: 'DiaSabado' },
  { id: 7, nombre: 'Domingo',  clave: 'DiaDomingo' },
]

// ── Claves del catálogo de términos ─────────────────────────
// Usado por IdentidadView para el combo de claves disponibles.

export const CLAVE_TERMINO_KEYS: ClaveTermino[] = [
  // Identidad
  'NombreAplicacion', 'LemaPrincipal', 'DescripcionBreve', 'MensajeComercial',
  'CtaPrincipal', 'CtaAlternativa',
  // Entidades
  'TerminoCliente', 'TerminoRecurso', 'TerminoServicio', 'TerminoCita',
  'TerminoHistorial', 'TerminoDisponibilidad',
  // Acciones
  'AccionNuevaAsignacion', 'AccionVerDisponibilidad', 'AccionBuscarCliente',
  'AccionGestionarRecursos', 'AccionGestionarServicios',
  // Pantallas
  'PantallaOperacionHoy', 'PantallaCalendario', 'PantallaDisponibilidad',
  'PantallaCatalogoServicios', 'PantallaClientes', 'PantallaRecursos',
  // Mensajes
  'MsgSeleccionarRecursos', 'MsgSeleccionarReserva', 'MsgProximaDisponibilidad',
  'MsgSinDatos', 'MsgCargando',
  // Notificaciones
  'NotifAsuntoNuevaCita', 'NotifCuerpoNuevaCita', 'NotifAsuntoRecordatorio',
  'NotifCuerpoRecordatorio', 'NotifAsuntoCancelacion', 'NotifCuerpoCancelacion',
  'NotifAsuntoReprogramacion', 'NotifCuerpoReprogramacion',
  // Teams
  'TeamsAsuntoEvento', 'TeamsCuerpoEvento', 'TeamsUbicacion',
  // PDFs
  'PdfTituloReporteCitas', 'PdfTituloHistorial', 'PdfColumnaCliente',
  'PdfColumnaRecurso', 'PdfColumnaServicio', 'PdfColumnaFechaHora', 'PdfColumnaEstado',
  // Estados de cita (nuevos)
  'EstadoProgramada', 'EstadoConfirmada', 'EstadoEnAtencion', 'EstadoRealizada',
  'EstadoCancelada', 'EstadoNoAsistio', 'EstadoReprogramada',
  // Días de la semana (nuevos)
  'DiaLunes', 'DiaMartes', 'DiaMiercoles', 'DiaJueves', 'DiaViernes', 'DiaSabado', 'DiaDomingo',
  // Agenda
  'VistaDiario', 'VistaSemanal', 'VistaMensual', 'VistaLista',
  'AgendaSub', 'BtnHoy', 'BtnActualizar', 'BtnTodos',
  'LabelProfesionales', 'LabelEstados', 'LabelDesde', 'LabelHasta',
  'MsgBuscando', 'MsgProximoTurno', 'MsgBuscarDesde', 'MsgDesdeLas', 'MsgDesdeLaManana',
  'MsgSinTurnosDisponibles', 'MsgSeleccionarProfesional', 'MsgSeleccionarCliente', 'MsgSinCitasFecha', 'MsgSinCitasRango',
  'MsgSeleccionarCita',
  'AccionVerDetalle', 'AccionProximoTurno', 'AccionEstado', 'AccionConfirmar', 'AccionIniciarAtencion',
  'AccionNoAsistio', 'AccionMarcarRealizada', 'AccionReprogramar', 'AccionCancelarCita',
  'BtnVolverAgenda', 'BtnConfirmarAccion', 'BtnCancelar',   'BtnUnirseTeams', 'BtnOk', 'BtnConfirmarCancelacion',
  'LabelAcciones', 'LabelNuevaFechaHora', 'LabelMotivoOpcional', 'LabelMotivoCancelacion',
  'LabelEspecificarMotivo', 'LabelHistorial',
  'DetalleCita', 'ColHora', 'ColEstado',
  'DetalleFecha', 'DetallePaciente', 'DetalleEdad', 'DetalleProfesional',
  'DetalleTipoCita', 'DetalleAseguradora', 'DetalleRegimen', 'DetalleMotivo', 'DetalleObservaciones',
  'UnidadAnios', 'MsgCargandoDetalle', 'MsgSinCambios', 'MsgMarcaraNoAsistio',
  'MsgGuardando', 'MsgCancelando', 'MsgEnDesarrollo', 'MsgDesde',
  'TituloCancelarCita', 'TituloCitaCancelada', 'MsgCitaCanceladaExito',
  'MsgCancelacionRequiereMotivo', 'MsgSeleccionarNuevaFecha',
  'MsgEscCerrar', 'MsgEnterCerrar',
  'PlaceholderSeleccionarMotivo', 'PlaceholderDescripcionCancelacion', 'PlaceholderMotivoReprogramacion',
  // Profesionales
  'ProfesionalesSub', 'PlaceholderBuscarNombre', 'LabelEspecialidad', 'LabelTodas',
  'LabelSede', 'LabelSoloActivos', 'BtnNuevoProfesional', 'MsgProfesionalCreado',
  'MsgProfesionalActualizado', 'MsgConfirmarInactivar', 'MsgProfesionalInactivado',
  'MsgSinProfesionales', 'ColConsultorio', 'ColRegistroMedico', 'BtnHorario',
  'MsgConteoProfesionales', 'TituloNuevoProfesional', 'TituloEditarProfesional',
  'ValEspecialidadRequerida', 'ValSedeRequerida', 'LabelNumeroIdentificacion',
  'LabelConsultorioSala', 'PlaceholderConsultorio', 'PlaceholderTarjetaProfesional',
  'BtnRegistrarProfesional',
  // Pacientes
  'PacientesSub', 'LabelNombre', 'LabelNumeroDocumento', 'LabelTipoIdentificacion',
  'LabelAseguradora', 'LabelTodos', 'BtnBuscar', 'BtnNuevoPaciente',
  'MsgMinimoNombre', 'MsgMinimoDocumento', 'MsgConfirmarInactivarPaciente',
  'MsgPacienteInactivado', 'MsgPacienteCreado', 'MsgPacienteActualizado', 'MsgSinPacientes',
  'ColIdentificacion', 'ColNumero', 'ColNombresCompletos', 'ColSexo', 'ColFechaNacimiento',
  'ColRegimen', 'ColContacto', 'ColEstado', 'ColAcciones',
  'EstadoActivo', 'EstadoInactivo', 'BtnEditar', 'BtnInactivar',
  'BtnAnterior', 'BtnSiguiente', 'MsgPaginaDe', 'MsgPacientesEncontrados',
  'TituloNuevoPaciente', 'TituloEditarPaciente', 'LabelNombresCompletos', 'LabelFechaNacimiento',
  'LabelSexo', 'LabelCelular', 'LabelCorreoElectronico', 'LabelWhatsApp',
  'LabelRegimen', 'LabelSinRegimen', 'LabelEmpresa', 'SeccionContacto', 'SeccionCobertura',
  'BtnRegistrarPaciente', 'BtnGuardarCambios',
  'ValidacionNombresObligatorios', 'ValidacionDocumentoObligatorio',
  'ValidacionNacimientoObligatorio', 'ValidacionSexoObligatorio',
  // Catálogos admin
  'CatalogoTitulo', 'CatalogoSub', 'CatalogoSeccion', 'CatalogoCargando',
  'CatalogoSinCatalogos', 'CatalogoAdministrar', 'CatalogoAct', 'CatalogoInac',
  'CatalogoBuscar', 'CatalogoBuscarPlaceholder', 'CatalogoTodos', 'CatalogoSoloActivos',
  'CatalogoRegistros', 'CatalogoNuevoRegistro', 'CatalogoGuardar', 'CatalogoGuardando',
  'CatalogoCancelar', 'CatalogoNoRegistros', 'CatalogoRequiereValidacion', 'CatalogoEstado',
  'CatalogoActivo', 'CatalogoInactivo', 'CatalogoEditar', 'CatalogoDesactivar',
  'CatalogoActivar', 'CatalogoBorrar', 'CatalogoPagina', 'CatalogoDe',
  'CatalogoAnterior', 'CatalogoSiguiente', 'CatalogoNoBorrar', 'CatalogoEnUsoDesactivar',
  'CatalogoEnUsoNoBorrar', 'CatalogoCerrar', 'CatalogoDesactivarRegistro',
  'CatalogoBorrarDefinitivamente', 'CatalogoRegistroEliminar', 'CatalogoSeEliminara',
  'CatalogoSiBorrar', 'CatalogoCompleteCampos', 'CatalogoRegistroCreado',
  'CatalogoRegistroActualizado', 'CatalogoRegistroDesactivado', 'CatalogoRegistroActivado',
  'CatalogoRegistroBorrado', 'CatalogoVolver', 'CatalogoNuevo',
  'CatalogoSi', 'CatalogoNo', 'CatalogoOpcionPorDefecto',
  // Disponibilidad
  'DispSub', 'BtnVolverProfesionales', 'LabelProfesional', 'BtnNuevaPlantilla',
  'MsgSinHorarios', 'MsgSeleccionarProfHorarios',
  'ColDia', 'ColDuracionTurno', 'ColSede', 'TxtMin',
  'TitBloqueosAgenda', 'BtnNuevoBloqueo', 'DispDescBloqueos', 'MsgSinBloqueos',
  'ColFranja', 'TxtDiaCompleto',
  'ConfirmInactivarHorario', 'ConfirmInactivarBloqueo', 'ConfirmInactivarExcepcion',
  'ExitoPlantillaCreada', 'ExitoPlantillaActualizada', 'ExitoHorarioInactivado',
  'ExitoBloqueoCreado', 'ExitoBloqueoInactivado',
  'TitExcepcionesHorarias', 'BtnNuevaExcepcion', 'DispDescExcepciones', 'MsgSinExcepciones',
  'ExitoExcepcionCreada', 'ExitoExcepcionInactivada',
  'TitEditarHorario', 'TitNuevoHorario', 'LabelDiaSemana', 'LabelHoraInicio', 'LabelHoraFin',
  'TxtMinutos', 'TxtSinSede', 'BtnGuardarPlantilla',
  'ValHorasRequeridas', 'ValHoraFinPosterior',
  'TitNuevoBloqueoAgenda', 'LabelMotivo', 'PhMotivoBloqueo',
  'LabelFechaDesde', 'LabelFechaHasta', 'ChkBloquearFranja',
  'ValMotivoRequerido', 'ValFechasRequeridas', 'ValFechaFinAnterior', 'ValHorasFranjaRequeridas',
  'BtnGuardarBloqueo',
  'TitNuevaExcepcionHoraria', 'LabelFecha', 'ValFechaRequerida', 'BtnGuardarExcepcion',
  'TxtPlantillaSingular', 'TxtPlantillaPlural', 'TxtBloqueoSingular', 'TxtBloqueoPlural',
  'TxtExcepcionSingular', 'TxtExcepcionPlural',
]
