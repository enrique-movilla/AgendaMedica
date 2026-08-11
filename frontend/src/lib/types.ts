export interface CitaDto {
  id: number
  fechaHora: string
  fechaHoraFin: string
  duracionMinutos: number
  estado: string
  estadoId: number
  tipoCita: TipoCitaDto
  paciente: PacienteResumenDto
  profesional: ProfesionalResumenDto
  aseguradora: AseguradoraResumenDto | null
  tipoUsuario: TipoUsuarioDto | null
  motivoConsulta: string | null
  observaciones: string | null
  teamsEventId: string | null
  teamsJoinUrl: string | null
  creadoPor: string
  fechaCreacion: string
  fechaModificacion: string | null
}

export interface AgendaDiaItemDto {
  citaId: number
  horaInicio: string
  horaFin: string
  paciente: string
  identificacion: string
  edadPaciente: number
  sexo: 'M' | 'F'
  tipoCita: string
  estado: string
  estadoId: number
  aseguradora: string | null
  regimen: string | null
  motivoConsulta: string | null
  teamsJoinUrl: string | null
  fecha: string
  profesionalId: number
  profesionalNombre: string
  especialidad: string | null
  duracionMinutos: number
}

export interface DisponibilidadDto {
  profesionalId: number
  nombreProfesional: string
  fecha: string
  duracionSlotMinutos: number
  slotsOcupados: SlotOcupadoDto[]
  slotsLibres: SlotLibreDto[]
}

export interface SlotOcupadoDto {
  horaInicio: string
  horaFin: string
  estado: string
}

export interface SlotLibreDto {
  horaInicio: string
  horaFin: string
  disponible: boolean
  consultorioSala: string | null
}

export interface HistorialEstadoDto {
  id: number
  estadoAnterior: string | null
  estadoNuevo: string
  motivo: string | null
  cambiadoPor: string
  fechaCambio: string
  origen: string
}

export type EstadoCitaId = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface PacienteResumenDto {
  id: number
  tipoIdentificacion: string
  numeroIdentificacion: string
  nombresCompletos: string
  edadAnios: number
  sexo: 'M' | 'F'
  celular: string | null
  email: string | null
  aseguradora: string | null
  regimen: string | null
}

export interface ProfesionalResumenDto {
  id: number
  nombresCompletos: string
  especialidad: string
  sede: string
  consultorioSala: string | null
  especialidadId: number
  sedeId: number
  tipoIdentificacion: string
  numeroIdentificacion: string
  celular: string | null
  email: string | null
  registroMedico: string | null
  activo: boolean
}

export interface TipoCitaDto {
  id: number
  nombre: string
  categoria: string
  duracionMinutos: number
  requiereValidacion: boolean
}

export interface AseguradoraResumenDto {
  id: number
  codigo: string
  sigla: string
  nombre: string
  tipoEntidad: string
}

export interface TipoUsuarioDto {
  id: number
  codigo: string
  nombre: string
}

export interface EspecialidadDto {
  id: number
  nombre: string
  descripcion: string | null
}

export interface SedeDto {
  id: number
  nombre: string
  direccion: string | null
  ciudad: string | null
}

export interface TipoIdentificacionDto {
  id: number
  codigo: string
  nombre: string
}

export interface AseguradoraDto {
  id: number
  tipoEntidadId: number
  tipoEntidad: string
  codigo: string
  sigla: string
  nombre: string
  gerente: string | null
  codigoMunicipio: string | null
  municipio: string | null
  departamento: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  url: string | null
  activo: boolean
}

export interface PacienteDto {
  id: number
  tipoIdentificacion: string
  numeroIdentificacion: string
  nombresCompletos: string
  fechaNacimiento: string
  edadAnios: number
  sexo: 'M' | 'F'
  celular: string | null
  email: string | null
  whatsapp: string | null
  aseguradoraId: number | null
  aseguradora: string | null
  codigoAseguradora: string | null
  tipoUsuarioId: number | null
  regimen: string | null
  empresa: string | null
  activo: boolean
  fechaCreacion: string
}

export interface PacienteListaDto {
  items: PacienteDto[]
  total: number
  pagina: number
  tamPagina: number
  totalPaginas: number
}

export interface CrearCitaRequest {
  fechaHora: string
  pacienteId: number
  profesionalId: number
  tipoCitaId: number
  aseguradoraId?: number | null
  tipoUsuarioId?: number | null
  motivoConsulta?: string | null
  observaciones?: string | null
  bloqueoId?: string | null
}

export interface ResultadoReservaBloqueo {
  exitoso: boolean
  bloqueoId?: string | null
  token?: string | null
  expiraEn?: string | null
  motivoRechazo?: string | null
}

export interface CrearPacienteRequest {
  tipoIdentificacionId: number
  numeroIdentificacion: string
  nombresCompletos: string
  fechaNacimiento: string
  sexo: 'M' | 'F'
  celular?: string | null
  email?: string | null
  whatsapp?: string | null
  aseguradoraId?: number | null
  tipoUsuarioId?: number | null
  empresa?: string | null
}

export interface ActualizarPacienteRequest {
  nombresCompletos?: string | null
  celular?: string | null
  email?: string | null
  whatsapp?: string | null
  aseguradoraId?: number | null
  tipoUsuarioId?: number | null
  empresa?: string | null
}

export interface CrearProfesionalRequest {
  tipoIdentificacionId: number
  numeroIdentificacion: string
  nombresCompletos: string
  especialidadId: number
  sedeId: number
  celular?: string | null
  email?: string | null
  consultorioSala?: string | null
  registroMedico?: string | null
}

export interface ActualizarProfesionalRequest {
  nombresCompletos?: string | null
  especialidadId?: number | null
  sedeId?: number | null
  celular?: string | null
  email?: string | null
  consultorioSala?: string | null
  registroMedico?: string | null
}

export interface DisponibilidadProfesionalDto {
  id: number
  profesionalId: number
  nombreProfesional: string
  diaSemana: number
  nombreDia: string
  horaInicio: string
  horaFin: string
  duracionMinutos: number
  sedeId: number | null
  sede: string | null
  consultorioSala: string | null
  activo: boolean
}

export interface CrearDisponibilidadRequest {
  profesionalId: number
  diaSemana: number
  horaInicio: string
  horaFin: string
  duracionMinutos: number
  sedeId?: number | null
  consultorioSala?: string | null
}

export interface ActualizarDisponibilidadRequest {
  diaSemana: number
  horaInicio: string
  horaFin: string
  duracionMinutos: number
  sedeId?: number | null
  consultorioSala?: string | null
}

export interface HistorialEstadoDto {
  id: number
  estadoAnterior: string | null
  estadoNuevo: string
  motivo: string | null
  cambiadoPor: string
  fechaCambio: string
  origen: string
}

export interface ConfiguracionBusquedaCampo {
  campo: string
  etiqueta: string
  minimoCaracteres: number
  maximoCaracteres: number
  topeResultados: number
}

// ── Administración de catálogos ─────────────────────────────
export type TipoCampoCatalogo = 'Texto' | 'Numero' | 'Logico'

export interface CampoCatalogo {
  campo: string
  etiqueta: string
  tipo: string
  requerido: boolean
}

export interface CatalogoPadreDefinicion {
  tabla: string
  etiqueta: string
  campoPadre: string
  campoClave: string
  campoEtiqueta: string
}

export interface CatalogoDefinicion {
  tabla: string
  etiqueta: string
  descripcion: string
  campoPrincipal: string
  campos: CampoCatalogo[]
  permiteActivos: boolean
  conteoActivos: number
  conteoInactivos: number
  padre: CatalogoPadreDefinicion | null
}

/** Fila genérica: id (string) + diccionario campo → valor. */
export interface CatalogoFila {
  id: string
  valores: Record<string, string | number | boolean | null>
}

export interface ResultadoCatalogo {
  items: CatalogoFila[]
  total: number
  pagina: number
  tamPagina: number
  totalPaginas: number
}

export interface DependenciaCatalogo {
  entidad: string
  descripcion: string
  conteo: number
}