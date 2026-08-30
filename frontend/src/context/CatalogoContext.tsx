// ============================================================
//  AGENDA MÉDICA — CONTEXTO DE CATÁLOGO DE TÉRMINOS PARAMÉTRICOS
//  Proyecto : AgendaMedica / frontend / src / context
//  Archivo  : CatalogoContext.tsx
// ============================================================
//  Provee un React Context + hook `useCatalogo()` para acceder
//  a los términos paramétricos del tenant activo.
//  Carga el catálogo al montar (o cuando cambia tenantId) y expone
//  la función `t('ClaveTermino')` para obtener el valor traducido.
// ============================================================

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { api } from '../lib/api'
import type { ClaveTermino } from '../lib/types'

// ── Valor por defecto para cuando no hay proveedor (evita crashes) ──
const DEFAULT_VALUES: Record<ClaveTermino, string> = {
  // Identidad
  NombreAplicacion: 'Sincora',
  LemaPrincipal: 'Recursos, tiempo y reservas en sincronía',
  DescripcionBreve: 'Plataforma para administrar disponibilidad y asignar recursos',
  MensajeComercial: 'Convierte disponibilidad en operaciones organizadas',
  CtaPrincipal: 'Organiza tus recursos',
  CtaAlternativa: 'Empieza a sincronizar tu operación',
  // Entidades
  TerminoCliente: 'Clientes',
  TerminoRecurso: 'Recursos',
  TerminoServicio: 'Servicios',
  TerminoCita: 'Citas',
  TerminoHistorial: 'Historial',
  TerminoDisponibilidad: 'Disponibilidad',
  // Acciones
  AccionNuevaAsignacion: 'Nueva asignación',
  AccionVerDisponibilidad: 'Ver disponibilidad',
  AccionBuscarCliente: 'Buscar clientes',
  AccionGestionarRecursos: 'Gestionar recursos',
  AccionGestionarServicios: 'Gestionar servicios',
  // Pantallas
  PantallaOperacionHoy: 'Operación de hoy',
  PantallaCalendario: 'Calendario de reservas por recurso',
  PantallaDisponibilidad: 'Disponibilidad y horarios',
  PantallaCatalogoServicios: 'Servicios y categorías',
  PantallaClientes: 'Clientes',
  PantallaRecursos: 'Recursos',
  // Mensajes
  MsgSeleccionarRecursos: 'Selecciona los recursos que deseas visualizar',
  MsgSeleccionarReserva: 'Selecciona una reserva para consultar sus detalles, historial y acciones',
  MsgProximaDisponibilidad: 'Próxima disponibilidad',
  MsgSinDatos: 'Sin datos para mostrar',
  MsgCargando: 'Cargando...',
  // Notificaciones
  NotifAsuntoNuevaCita: 'Nueva cita agendada',
  NotifCuerpoNuevaCita: 'Se ha agendado una nueva cita para {fecha} a las {hora}.',
  NotifAsuntoRecordatorio: 'Recordatorio de cita',
  NotifCuerpoRecordatorio: 'Tiene una cita programada para mañana a las {hora}.',
  NotifAsuntoCancelacion: 'Cita cancelada',
  NotifCuerpoCancelacion: 'Su cita del {fecha} a las {hora} ha sido cancelada. Motivo: {motivo}.',
  NotifAsuntoReprogramacion: 'Cita reprogramada',
  NotifCuerpoReprogramacion: 'Su cita ha sido reprogramada para el {fecha} a las {hora}.',
  // Teams
  TeamsAsuntoEvento: 'Cita: {paciente} - {tipoCita}',
  TeamsCuerpoEvento: 'Cita con {paciente} ({identificacion}). Tipo: {tipoCita}. Profesional: {profesional}.',
  TeamsUbicacion: 'Consultorio {consultorio}',
  // PDFs
  PdfTituloReporteCitas: 'Reporte de Citas',
  PdfTituloHistorial: 'Historial de Citas',
  PdfColumnaCliente: 'Cliente',
  PdfColumnaRecurso: 'Recurso',
  PdfColumnaServicio: 'Servicio',
  PdfColumnaFechaHora: 'Fecha y Hora',
  PdfColumnaEstado: 'Estado',
  // Estados de cita
  EstadoProgramada: 'Programada',
  EstadoConfirmada: 'Confirmada',
  EstadoEnAtencion: 'En atención',
  EstadoRealizada: 'Realizada',
  EstadoCancelada: 'Cancelada',
  EstadoNoAsistio: 'No asistió',
  EstadoReprogramada: 'Reprogramada',
  // Días de la semana
  DiaLunes: 'Lunes',
  DiaMartes: 'Martes',
  DiaMiercoles: 'Miércoles',
  DiaJueves: 'Jueves',
  DiaViernes: 'Viernes',
  DiaSabado: 'Sábado',
  DiaDomingo: 'Domingo',
  // Agenda — vistas
  VistaDiario: 'Diario',
  VistaSemanal: 'Semanal',
  VistaMensual: 'Mensual',
  VistaLista: 'Lista',
  // Agenda — general
  AgendaSub: 'Calendario de citas por profesional. Seleccione los médicos a mostrar.',
  BtnHoy: 'Hoy',
  BtnActualizar: 'Actualizar',
  BtnTodos: 'Todos',
  LabelProfesionales: 'Profesionales',
  LabelEstados: 'Estados:',
  LabelDesde: 'Desde',
  LabelHasta: 'Hasta',
  MsgBuscando: 'Buscando…',
  MsgProximoTurno: 'Próximo turno: {turno}',
  MsgBuscarDesde: 'Buscar a partir del',
  MsgDesdeLas: 'desde las',
  MsgDesdeLaManana: 'desde la mañana',
  MsgSinTurnosDisponibles: 'No hay turnos disponibles en los próximos 30 días para los profesionales seleccionados.',
  MsgSeleccionarProfesional: 'Seleccione al menos un profesional para ver el calendario.',
  MsgSinCitasFecha: 'No hay citas para esta fecha y los profesionales seleccionados.',
  MsgSinCitasRango: 'No hay citas en el rango seleccionado.',
  MsgSeleccionarCita: 'Seleccione una cita para ver su detalle, historial y acciones.',
  // Agenda — acciones
  AccionVerDetalle: 'Ver detalle',
  AccionProximoTurno: 'Próximo turno disponible',
  AccionEstado: 'Acciones de estado…',
  AccionConfirmar: 'Confirmar',
  AccionIniciarAtencion: 'Iniciar atención',
  AccionNoAsistio: 'No asistió',
  AccionMarcarRealizada: 'Marcar realizada',
  AccionReprogramar: 'Reprogramar',
  AccionCancelarCita: 'Cancelar Cita',
  BtnVolverAgenda: 'Volver a la agenda',
  BtnConfirmarAccion: 'Confirmar acción',
  BtnCancelar: 'Cancelar',
  BtnUnirseTeams: 'Unirse a Teams →',
  BtnOk: 'OK',
  BtnConfirmarCancelacion: 'Confirmar cancelación',
  // Agenda — panel detalle
  DetalleCita: 'Cita',
  ColHora: 'Hora',
  ColEstado: 'Estado',
  LabelAcciones: 'Acciones',
  LabelNuevaFechaHora: 'Nueva fecha y hora',
  LabelMotivoOpcional: 'Motivo (opcional)',
  LabelMotivoCancelacion: 'Motivo de cancelación *',
  LabelEspecificarMotivo: 'Especifique el motivo *',
  LabelHistorial: 'Historial',
  DetalleFecha: 'Fecha',
  DetallePaciente: 'Paciente',
  DetalleEdad: 'Edad',
  DetalleProfesional: 'Profesional',
  DetalleTipoCita: 'Tipo de cita',
  DetalleAseguradora: 'Aseguradora',
  DetalleRegimen: 'Régimen',
  DetalleMotivo: 'Motivo',
  DetalleObservaciones: 'Observaciones',
  UnidadAnios: 'años',
  MsgCargandoDetalle: 'Cargando detalle…',
  MsgSinCambios: 'Sin cambios registrados.',
  MsgMarcaraNoAsistio: 'Se marcará la cita como no asistió.',
  MsgGuardando: 'Guardando…',
  MsgCancelando: 'Cancelando…',
  MsgEnDesarrollo: 'Esta funcionalidad está en desarrollo.',
  MsgDesde: 'desde',
  // Agenda — cancelación
  TituloCancelarCita: 'Cancelar cita',
  TituloCitaCancelada: 'Cita cancelada',
  MsgCitaCanceladaExito: 'La cita fue cancelada exitosamente.',
  MsgCancelacionRequiereMotivo: 'La cancelación requiere un motivo.',
  MsgSeleccionarNuevaFecha: 'Seleccione la nueva fecha y hora.',
  MsgEscCerrar: 'ESC para cerrar',
  MsgEnterCerrar: 'Enter o clic para cerrar',
  PlaceholderSeleccionarMotivo: 'Seleccionar motivo…',
  PlaceholderDescripcionCancelacion: 'Describa el motivo de la cancelación',
  PlaceholderMotivoReprogramacion: 'Motivo de la reprogramación',
  // Profesionales
  ProfesionalesSub: 'Responsables de atención: médicos y demás profesionales que atienden citas.',
  PlaceholderBuscarNombre: 'Buscar por nombre…',
  LabelEspecialidad: 'Especialidad',
  LabelTodas: 'Todas',
  LabelSede: 'Sede',
  LabelSoloActivos: 'Solo activos',
  BtnNuevoProfesional: 'Nuevo profesional',
  MsgProfesionalCreado: 'Profesional creado correctamente.',
  MsgProfesionalActualizado: 'Profesional actualizado correctamente.',
  MsgConfirmarInactivar: '¿Desea inactivar al profesional {nombre}? No aparecerá en los resultados activos.',
  MsgProfesionalInactivado: 'Profesional {nombre} inactivado.',
  MsgSinProfesionales: 'No se encontraron profesionales con los criterios indicados.',
  ColConsultorio: 'Consultorio',
  ColRegistroMedico: 'Registro médico',
  BtnHorario: 'Horario',
  MsgConteoProfesionales: 'profesional',
  TituloNuevoProfesional: 'Nuevo profesional',
  TituloEditarProfesional: 'Editar profesional',
  ValEspecialidadRequerida: 'La especialidad es obligatoria.',
  ValSedeRequerida: 'La sede es obligatoria.',
  LabelNumeroIdentificacion: 'Número de identificación',
  LabelConsultorioSala: 'Consultorio / Sala',
  PlaceholderConsultorio: 'Ej. Consultorio 101',
  PlaceholderTarjetaProfesional: 'Número de tarjeta profesional',
  BtnRegistrarProfesional: 'Registrar profesional',
  // Pacientes
  PacientesSub: 'Registre, consulte y administre los pacientes de la institución.',
  LabelNombre: 'Nombre',
  LabelNumeroDocumento: 'Número de documento',
  LabelTipoIdentificacion: 'Tipo de identificación',
  LabelAseguradora: 'Aseguradora',
  LabelTodos: 'Todos',
  BtnBuscar: 'Buscar',
  BtnNuevoPaciente: 'Nuevo paciente',
  MsgMinimoNombre: 'El nombre requiere al menos {minimo} caracteres para buscar.',
  MsgMinimoDocumento: 'El número de documento requiere al menos {minimo} caracteres para buscar.',
  MsgConfirmarInactivarPaciente: '¿Desea inactivar al paciente {nombre}? No aparecerá en los resultados activos.',
  MsgPacienteInactivado: 'Paciente {nombre} inactivado.',
  MsgPacienteCreado: 'Paciente creado correctamente.',
  MsgPacienteActualizado: 'Paciente actualizado correctamente.',
  MsgSinPacientes: 'No se encontraron pacientes con los criterios indicados.',
  ColIdentificacion: 'Identificación',
  ColNumero: 'Número',
  ColNombresCompletos: 'Nombres completos',
  ColSexo: 'Sexo',
  ColFechaNacimiento: 'Fecha nacimiento',
  ColRegimen: 'Régimen',
  ColContacto: 'Contacto',
  ColAcciones: 'Acciones',
  EstadoActivo: 'Activo',
  EstadoInactivo: 'Inactivo',
  BtnEditar: 'Editar',
  BtnInactivar: 'Inactivar',
  BtnAnterior: 'Anterior',
  BtnSiguiente: 'Siguiente',
  MsgPaginaDe: 'Página {actual} de {total}',
  MsgPacientesEncontrados: '{total} pacientes',
  TituloNuevoPaciente: 'Nuevo paciente',
  TituloEditarPaciente: 'Editar paciente',
  LabelNombresCompletos: 'Nombres completos',
  LabelFechaNacimiento: 'Fecha de nacimiento',
  LabelSexo: 'Sexo',
  LabelCelular: 'Celular',
  LabelCorreoElectronico: 'Correo electrónico',
  LabelWhatsApp: 'WhatsApp',
  LabelRegimen: 'Régimen',
  LabelSinRegimen: 'Sin régimen',
  LabelEmpresa: 'Empresa',
  SeccionContacto: 'Contacto',
  SeccionCobertura: 'Cobertura',
  BtnRegistrarPaciente: 'Registrar paciente',
  BtnGuardarCambios: 'Guardar cambios',
  ValidacionNombresObligatorios: 'Los nombres completos son obligatorios.',
  ValidacionDocumentoObligatorio: 'El número de identificación es obligatorio.',
  ValidacionNacimientoObligatorio: 'La fecha de nacimiento es obligatoria.',
  ValidacionSexoObligatorio: 'El sexo es obligatorio.',
  // Catálogos admin
  CatalogoTitulo: 'Catálogos',
  CatalogoSub: 'Datos de referencia del sistema. Seleccione un catálogo para administrarlo.',
  CatalogoSeccion: 'Catálogos administrables',
  CatalogoCargando: 'Cargando catálogos…',
  CatalogoSinCatalogos: 'No hay catálogos administrables.',
  CatalogoAdministrar: 'Administrar →',
  CatalogoAct: 'act.',
  CatalogoInac: 'inac.',
  CatalogoBuscar: 'Buscar',
  CatalogoBuscarPlaceholder: 'Buscar…',
  CatalogoTodos: 'Todos',
  CatalogoSoloActivos: 'Solo activos',
  CatalogoRegistros: 'registro',
  CatalogoNuevoRegistro: '+ Nuevo registro',
  CatalogoGuardar: 'Guardar',
  CatalogoGuardando: 'Guardando…',
  CatalogoCancelar: 'Cancelar',
  CatalogoNoRegistros: 'No hay registros con los criterios indicados.',
  CatalogoRequiereValidacion: 'Requiere validación',
  CatalogoEstado: 'Estado',
  CatalogoActivo: 'Activo',
  CatalogoInactivo: 'Inactivo',
  CatalogoEditar: 'Editar',
  CatalogoDesactivar: 'Desactivar',
  CatalogoActivar: 'Activar',
  CatalogoBorrar: 'Borrar',
  CatalogoPagina: 'Página',
  CatalogoDe: 'de',
  CatalogoAnterior: 'Anterior',
  CatalogoSiguiente: 'Siguiente',
  CatalogoNoBorrar: 'No se puede borrar',
  CatalogoEnUsoDesactivar: 'Este registro está en uso. Puede desactivarlo en lugar de borrarlo.',
  CatalogoEnUsoNoBorrar: 'Este registro está en uso y no se puede borrar.',
  CatalogoCerrar: 'Cerrar',
  CatalogoDesactivarRegistro: 'Desactivar registro',
  CatalogoBorrarDefinitivamente: '¿Borrar definitivamente?',
  CatalogoRegistroEliminar: 'El registro',
  CatalogoSeEliminara: 'se eliminará de forma permanente. Esta acción no se puede deshacer.',
  CatalogoSiBorrar: 'Sí, borrar',
  CatalogoCompleteCampos: 'Complete los campos requeridos:',
  CatalogoRegistroCreado: 'Registro creado correctamente.',
  CatalogoRegistroActualizado: 'Registro actualizado correctamente.',
  CatalogoRegistroDesactivado: 'Registro desactivado.',
  CatalogoRegistroActivado: 'Registro activado.',
  CatalogoRegistroBorrado: 'Registro borrado definitivamente.',
  CatalogoVolver: '← Volver',
  CatalogoNuevo: 'Nuevo',
  CatalogoSi: 'Sí',
  CatalogoNo: 'No',
  CatalogoOpcionPorDefecto: 'Seleccionar',
  // Disponibilidad
  DispSub: 'Defina en qué días y franjas horarias atiende cada profesional. Los slots libres de la agenda se calculan a partir de estas plantillas.',
  BtnVolverProfesionales: '← Volver a profesionales',
  LabelProfesional: 'Profesional',
  BtnNuevaPlantilla: 'Nueva plantilla',
  MsgSinHorarios: 'Este profesional no tiene horarios configurados. Cree una plantilla para generar slots disponibles.',
  MsgSeleccionarProfHorarios: 'Seleccione un profesional para ver sus horarios.',
  ColDia: 'Día',
  ColDuracionTurno: 'Duración turno',
  ColSede: 'Sede',
  TxtMin: 'min',
  TitBloqueosAgenda: 'Bloqueos de agenda',
  BtnNuevoBloqueo: 'Nuevo bloqueo',
  DispDescBloqueos: 'Vacaciones, congresos o descansos que suspenden la atención. Si indica hora de inicio y fin, solo se bloquea esa franja del día (por ejemplo, almuerzo).',
  MsgSinBloqueos: 'No hay bloqueos configurados para este profesional.',
  ColFranja: 'Franja',
  TxtDiaCompleto: 'Día completo',
  ConfirmInactivarHorario: '¿Desea inactivar el horario del {dia} ({inicio}–{fin})?',
  ConfirmInactivarBloqueo: '¿Desea inactivar el bloqueo "{motivo}" del {desde} al {hasta}?',
  ConfirmInactivarExcepcion: '¿Desea inactivar la excepción del {fecha}?',
  ExitoPlantillaCreada: 'Plantilla creada correctamente.',
  ExitoPlantillaActualizada: 'Plantilla actualizada correctamente.',
  ExitoHorarioInactivado: 'Horario del {dia} inactivado.',
  ExitoBloqueoCreado: 'Bloqueo creado correctamente.',
  ExitoBloqueoInactivado: 'Bloqueo inactivado.',
  TitExcepcionesHorarias: 'Excepciones horarias',
  BtnNuevaExcepcion: 'Nueva excepción',
  DispDescExcepciones: 'Un día puntual en que el profesional atiende con un horario distinto al de su plantilla semanal (jornada reducida, campaña, puente…). Reemplaza la plantilla de ese día.',
  MsgSinExcepciones: 'No hay excepciones horarias para este profesional.',
  ExitoExcepcionCreada: 'Excepción horaria creada correctamente.',
  ExitoExcepcionInactivada: 'Excepción horaria inactivada.',
  TitEditarHorario: 'Editar horario',
  TitNuevoHorario: 'Nuevo horario',
  LabelDiaSemana: 'Día de la semana',
  LabelHoraInicio: 'Hora de inicio',
  LabelHoraFin: 'Hora de fin',
  TxtMinutos: 'minutos',
  TxtSinSede: 'Sin sede',
  BtnGuardarPlantilla: 'Guardar plantilla',
  ValHorasRequeridas: 'Debe indicar hora de inicio y fin.',
  ValHoraFinPosterior: 'La hora de fin debe ser posterior a la hora de inicio.',
  TitNuevoBloqueoAgenda: 'Nuevo bloqueo de agenda',
  LabelMotivo: 'Motivo',
  PhMotivoBloqueo: 'Ej. Vacaciones, congreso, almuerzo…',
  LabelFechaDesde: 'Fecha desde',
  LabelFechaHasta: 'Fecha hasta',
  ChkBloquearFranja: 'Bloquear solo una franja del día (dejar el resto disponible)',
  ValMotivoRequerido: 'Debe indicar un motivo.',
  ValFechasRequeridas: 'Debe indicar la fecha de inicio y fin.',
  ValFechaFinAnterior: 'La fecha final no puede ser anterior a la inicial.',
  ValHorasFranjaRequeridas: 'Debe indicar hora de inicio y fin de la franja.',
  BtnGuardarBloqueo: 'Guardar bloqueo',
  TitNuevaExcepcionHoraria: 'Nueva excepción horaria',
  LabelFecha: 'Fecha',
  ValFechaRequerida: 'Debe indicar la fecha.',
  BtnGuardarExcepcion: 'Guardar excepción',
  TxtPlantillaSingular: 'plantilla',
  TxtPlantillaPlural: 'plantillas',
  TxtBloqueoSingular: 'bloqueo',
  TxtBloqueoPlural: 'bloqueos',
  TxtExcepcionSingular: 'excepción',
  TxtExcepcionPlural: 'excepciones',
}

interface CatalogoContextValue {
  /** Diccionario clave → valor cargado del backend */
  terminos: Record<ClaveTermino, string>
  /** True mientras se carga el catálogo inicial */
  cargando: boolean
  /** Error si falló la carga */
  error: string | null
  /** TenantId activo */
  tenantId: number
  /** Cambia el tenant activo y recarga el catálogo */
  setTenantId: (id: number) => void
  /** Vertical activa (default, salud, belleza, servicios, taller) */
  vertical: string
  /** Cambia la vertical y recarga el catálogo */
  setVertical: (v: string) => void
  /** Fuerza recarga del catálogo */
  recargar: () => Promise<void>
  /** Obtiene el valor de una clave (fallback a DEFAULT_VALUES) */
  t: (clave: ClaveTermino) => string
  /** Obtiene el valor con interpolación simple: t('Clave', { fecha: '2026-01-15' }) */
  tf: (clave: ClaveTermino, params?: Record<string, string>) => string
}

const CatalogoContext = createContext<CatalogoContextValue | null>(null)

export function CatalogoProvider({ children, tenantId: initialTenantId = 1 }: { children: ReactNode; tenantId?: number }) {
  const [tenantId, setTenantIdState] = useState<number>(initialTenantId)
  const [vertical, setVerticalState] = useState<string>(() => localStorage.getItem('verticalActiva') ?? 'default')
  const [terminos, setTerminos] = useState<Record<ClaveTermino, string>>({} as Record<ClaveTermino, string>)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await api.catalogoTerminos(tenantId, vertical)
      const mapa: Record<ClaveTermino, string> = {} as Record<ClaveTermino, string>
      for (const item of data) {
        if (item.activo) {
          mapa[item.clave] = item.valor
        }
      }
      // Merge con defaults (defaults como fallback)
      const merged = { ...DEFAULT_VALUES, ...mapa } as Record<ClaveTermino, string>
      setTerminos(merged)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error cargando catálogo de términos'
      setError(msg)
      // En error, usar defaults
      setTerminos(DEFAULT_VALUES)
    } finally {
      setCargando(false)
    }
  }, [tenantId, vertical])

  useEffect(() => {
    cargar()
  }, [cargar])

  const setTenantId = (id: number) => {
    setTenantIdState(id)
  }

  const setVertical = (v: string) => {
    setVerticalState(v)
    localStorage.setItem('verticalActiva', v)
  }

  const t = (clave: ClaveTermino): string => {
    return terminos[clave] ?? DEFAULT_VALUES[clave] ?? clave
  }

  const tf = (clave: ClaveTermino, params?: Record<string, string>): string => {
    let valor = t(clave)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        valor = valor.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
      }
    }
    return valor
  }

  const value: CatalogoContextValue = {
    terminos,
    cargando,
    error,
    tenantId,
    setTenantId,
    vertical,
    setVertical,
    recargar: cargar,
    t,
    tf,
  }

  return <CatalogoContext.Provider value={value}>{children}</CatalogoContext.Provider>
}

/**
 * Hook para acceder al catálogo de términos paramétricos.
 * Debe usarse dentro de un `CatalogoProvider`.
 *
 * @example
 * ```tsx
 * const { t, tf, tenantId, cargando } = useCatalogo()
 * return <h1>{t('NombreAplicacion')}</h1>
 * return <p>{tf('NotifCuerpoRecordatorio', { fecha: 'mañana', hora: '10:00' })}</p>
 * ```
 */
export function useCatalogo(): CatalogoContextValue {
  const ctx = useContext(CatalogoContext)
  if (!ctx) {
    throw new Error('useCatalogo debe usarse dentro de un CatalogoProvider')
  }
  return ctx
}

/**
 * Hook de solo lectura para obtener un término específico.
 * Útil cuando solo se necesita una clave.
 */
export function useTermino(clave: ClaveTermino): string {
  const { t } = useCatalogo()
  return t(clave)
}