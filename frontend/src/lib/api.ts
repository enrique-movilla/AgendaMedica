import type {
  ActualizarPacienteRequest,
  AgendaDiaItemDto,
  AseguradoraDto,
  CatalogoDefinicion,
  CatalogoFila,
  ConfiguracionBusquedaCampo,
  CrearCitaRequest,
  CrearPacienteRequest,
  CitaDto,
  DependenciaCatalogo,
  DisponibilidadDto,
  EspecialidadDto,
  HistorialEstadoDto,
  PacienteDto,
  PacienteListaDto,
  ProfesionalResumenDto,
  ResultadoCatalogo,
  SedeDto,
  TipoCitaDto,
  TipoIdentificacionDto,
  TipoUsuarioDto,
} from './types'

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5047'

export interface TipoEntidadDto {
  id: number
  codigo: string
  nombre: string
  otroNombre: string | null
}

export interface DepartamentoDto {
  codigoDane: string
  nombre: string
}

export interface MunicipioDto {
  codigoDane: string
  codigoDepartamento: string
  nombre: string
  tipo: string
  longitud: number | null
  latitud: number | null
}

export class ApiError extends Error {
  codigo: string
  status: number

  constructor(status: number, codigo: string, mensaje: string) {
    super(mensaje)
    this.name = 'ApiError'
    this.codigo = codigo
    this.status = status
  }
}

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return ''
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (entries.length === 0) return ''
  return `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!res.ok) {
    let codigo = 'ERROR'
    let mensaje = `Error ${res.status}`
    try {
      const body = await res.json()
      if (typeof body === 'string') {
        mensaje = body
      } else if (body) {
        const b = body as { codigo?: string; mensaje?: string; message?: string; title?: string }
        codigo = b.codigo ?? 'ERROR'
        mensaje = b.mensaje ?? b.message ?? b.title ?? mensaje
      }
    } catch {
      /* cuerpo no JSON */
    }
    throw new ApiError(res.status, codigo, mensaje)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  // ── Profesionales ──
  profesionales: (params?: { especialidad_id?: number; sedeId?: number }) =>
    request<ProfesionalResumenDto[]>(`/v1/profesionales${toQuery(params)}`),

  // ── Catálogos ──
  especialidades: () => request<EspecialidadDto[]>('/v1/catalogo/especialidades'),
  tiposCita: (categoria?: string) =>
    request<TipoCitaDto[]>(`/v1/catalogo/tipos-cita${toQuery({ categoria })}`),
  aseguradoras: (params?: { nombre?: string; tipoEntidadId?: number }) =>
    request<AseguradoraDto[]>(`/v1/catalogo/aseguradoras${toQuery(params)}`),
  sedes: () => request<SedeDto[]>('/v1/catalogo/sedes'),
  tiposIdentificacion: () =>
    request<TipoIdentificacionDto[]>('/v1/catalogo/tipos-identificacion'),
  tiposEntidad: () => request<TipoEntidadDto[]>('/v1/catalogo/tipos-entidad'),
  tiposUsuario: () => request<TipoUsuarioDto[]>('/v1/catalogo/tipos-usuario'),
  departamentos: () => request<DepartamentoDto[]>('/v1/catalogo/departamentos'),
  municipios: (params: { codigoDepartamento?: string; nombre?: string }) =>
    request<MunicipioDto[]>(`/v1/catalogo/municipios${toQuery(params)}`),

  // ── Configuración de búsqueda ──
  configBusqueda: () => request<ConfiguracionBusquedaCampo[]>('/v1/config/busqueda'),

  // ── Administración de catálogos (genérico) ──
  catalogosAdmin: () => request<CatalogoDefinicion[]>('/v1/admin/catalogos'),
  catalogoAdminListar: (
    tabla: string,
    params?: {
      termino?: string
      pagina?: number
      tamPagina?: number
      soloActivos?: boolean
      filtroPadre?: string
    },
  ) => request<ResultadoCatalogo>(`/v1/admin/catalogos/${tabla}${toQuery(params)}`),
  catalogoAdminCrear: (tabla: string, valores: Record<string, unknown>) =>
    request<CatalogoFila>(`/v1/admin/catalogos/${tabla}`, {
      method: 'POST',
      body: JSON.stringify(valores),
    }),
  catalogoAdminActualizar: (tabla: string, id: string, valores: Record<string, unknown>) =>
    request<CatalogoFila>(`/v1/admin/catalogos/${tabla}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(valores),
    }),
  catalogoAdminInactivar: (tabla: string, id: string) =>
    request<void>(`/v1/admin/catalogos/${tabla}/${id}`, { method: 'DELETE' }),
  catalogoAdminReactivar: (tabla: string, id: string) =>
    request<void>(`/v1/admin/catalogos/${tabla}/${id}/reactivar`, { method: 'POST' }),
  catalogoAdminBorrar: (tabla: string, id: string) =>
    request<void>(`/v1/admin/catalogos/${tabla}/${id}/permanente`, { method: 'DELETE' }),
  catalogoAdminDependencias: (tabla: string, id: string) =>
    request<DependenciaCatalogo[]>(`/v1/admin/catalogos/${tabla}/${id}/dependencias`),

  // ── Pacientes ──
  pacientes: (params?: {
    nombre?: string
    tipoIdentificacionId?: number
    numeroIdentificacion?: string
    aseguradoraId?: number
    pagina?: number
    tamPagina?: number
  }) => request<PacienteListaDto>(`/v1/pacientes${toQuery(params)}`),
  paciente: (id: number) => request<PacienteDto>(`/v1/pacientes/${id}`),
  crearPaciente: (payload: CrearPacienteRequest) =>
    request<PacienteDto>('/v1/pacientes', { method: 'POST', body: JSON.stringify(payload) }),
  actualizarPaciente: (id: number, payload: ActualizarPacienteRequest) =>
    request<PacienteDto>(`/v1/pacientes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  inactivarPaciente: (id: number) =>
    request<void>(`/v1/pacientes/${id}`, { method: 'DELETE' }),
  citasPaciente: (id: number, params?: { pagina?: number; tamPagina?: number }) =>
    request<CitaDto[]>(`/v1/pacientes/${id}/citas${toQuery(params)}`),

  // ── Citas ──
  cita: (id: number) => request<CitaDto>(`/v1/citas/${id}`),
  crearCita: (payload: CrearCitaRequest) =>
    request<CitaDto>('/v1/citas', { method: 'POST', body: JSON.stringify(payload) }),
  agendaDia: (params: { profesionalId: number; fecha: string }) =>
    request<AgendaDiaItemDto[]>(`/v1/citas/agenda-dia${toQuery(params)}`),
  agendaRango: (params: {
    profesionalesIds: number[]
    fechaDesde: string
    fechaHasta: string
  }) =>
    request<AgendaDiaItemDto[]>(
      `/v1/citas/agenda-rango${toQuery({
        profesionalesIds: params.profesionalesIds.join(','),
        fechaDesde: params.fechaDesde,
        fechaHasta: params.fechaHasta,
      })}`,
    ),
  disponibilidad: (params: { profesionalId: number; fecha: string; tipoCitaId: number }) =>
    request<DisponibilidadDto>(`/v1/citas/disponibilidad${toQuery(params)}`),
  historialCita: (id: number) =>
    request<HistorialEstadoDto[]>(`/v1/citas/${id}/historial`),
  cambiarEstadoCita: (id: number, payload: { nuevoEstadoId: number; motivo?: string | null }) =>
    request<CitaDto>(`/v1/citas/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  cancelarCita: (id: number, payload: { motivo: string }) =>
    request<CitaDto>(`/v1/citas/${id}/cancelar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  modificarCita: (
    id: number,
    payload: { nuevaFechaHora?: string; observaciones?: string | null; motivo?: string | null },
  ) =>
    request<CitaDto>(`/v1/citas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
}