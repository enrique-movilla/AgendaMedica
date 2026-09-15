import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../lib/api'
import { useCatalogo } from '../context/CatalogoContext'
import {
  hoyISO,
  sumarDias,
  lunesDeLaSemana,
  primerUltimoDiaMes,
  aMinutos,
  formatFecha,
  formatFechaHora,
  diaANombre,
  conSegundos,
  msgError,
  estadoBadge,
  colorEstado,
} from '../lib/helpers'
import {
  inputCls,
  ESTADOS_CITA,
  ANCHO_COL,
  ANCHO_ESCALA,
  pxHora,
  horasEje,
} from '../lib/constants'
import { leerIdsPerfil, guardarIdsPerfil, hayAmbienteGuardado, leerVistaPerfil, guardarVistaPerfil, type PerfilId } from '../lib/perfil'
import { Cabecera, Aviso, Exito, Spinner, FilaDetalle } from '../components/shared'
import type {
  AgendaDiaItemDto,
  CitaDto,
  HistorialEstadoDto,
  MotivoCancelacionDto,
  ProfesionalResumenDto,
  SlotLibreDto,
  TipoCitaDto,
} from '../lib/types'

// ── Tipos ───────────────────────────────────────────────────

export type VistaAgenda = 'diario' | 'semanal' | 'mensual' | 'lista'

type FilaAgenda = { profesional: ProfesionalResumenDto; items: AgendaDiaItemDto[] }

/** Hint para NuevaCitaView cuando se agenda desde un slot libre. */
export type CitaHint = {
  fechaHora: string
  profesionalId?: number
  tipoCitaId?: number
  consultorioSala?: string | null
  motivo?: string
  bloqueoId?: string | null
}

// ── Selector de recursos con buscador (Opción 1+4) ─────────────
// Buscador con autocompletado + chips de seleccionados +
// favoritos/recientes por perfil + aviso de novedades.
// Solo se cargan las agendas de los recursos seleccionados
// (ver efecto agendaRango).
const MAX_SUGERENCIAS = 60

/** Minúsculas sin tildes para buscar "Garcia" == "García". */
function normalizarTexto(s: string) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function SelectorRecursos({
  profesionales,
  seleccionados,
  perfil,
  onCambiar,
}: {
  profesionales: ProfesionalResumenDto[]
  seleccionados: number[]
  perfil: PerfilId
  onCambiar: (ids: number[]) => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [soloNovedades, setSoloNovedades] = useState(false)
  const [favoritos, setFavoritos] = useState<number[]>(() => leerIdsPerfil(perfil, 'favoritos'))
  const [conocidos, setConocidos] = useState<number[]>(() => leerIdsPerfil(perfil, 'conocidos'))
  const inicializado = useRef(false)
  const cajaRef = useRef<HTMLDivElement>(null)

  const activos = useMemo(() => profesionales.filter((p) => p.activo), [profesionales])
  const porId = useMemo(() => new Map(activos.map((p) => [p.id, p])), [activos])
  const nuevos = useMemo(
    () => activos.filter((p) => !conocidos.includes(p.id)),
    [activos, conocidos],
  )

  // Cierra el desplegable al hacer clic fuera.
  useEffect(() => {
    if (!abierto) return
    function alClicFuera(e: MouseEvent) {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClicFuera)
    return () => document.removeEventListener('mousedown', alClicFuera)
  }, [abierto])

  // Primera carga: registra favoritos/recientes como conocidos para que el
  // aviso de novedades solo muestre recursos realmente nuevos. La selección
  // se restaura tal como quedó (ver clave 'seleccion'); aquí no se preselecciona.
  useEffect(() => {
    if (inicializado.current || activos.length === 0) return
    inicializado.current = true
    const existentes = new Set(activos.map((p) => p.id))
    const favOk = leerIdsPerfil(perfil, 'favoritos').filter((id) => existentes.has(id))
    const recOk = leerIdsPerfil(perfil, 'recientes').filter((id) => existentes.has(id))
    setFavoritos(favOk)
    setConocidos((prev) => {
      const todos = Array.from(new Set([...prev, ...favOk, ...recOk]))
      guardarIdsPerfil(perfil, 'conocidos', todos)
      return todos
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activos])

  /** Registra uso: sube a recientes y marca como conocidos. */
  function registrarUso(idsAgregados: number[]) {
    if (idsAgregados.length === 0) return
    const previos = leerIdsPerfil(perfil, 'recientes')
    guardarIdsPerfil(perfil, 'recientes', Array.from(new Set([...idsAgregados, ...previos])).slice(0, 8))
    setConocidos((prev) => {
      const sig = Array.from(new Set([...prev, ...idsAgregados]))
      guardarIdsPerfil(perfil, 'conocidos', sig)
      return sig
    })
  }

  function alternar(id: number) {
    if (seleccionados.includes(id)) {
      onCambiar(seleccionados.filter((x) => x !== id))
    } else {
      registrarUso([id])
      onCambiar([...seleccionados, id])
    }
    setBusqueda('')
  }

  function alternarFavorito(id: number) {
    setFavoritos((prev) => {
      const sig = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      guardarIdsPerfil(perfil, 'favoritos', sig)
      return sig
    })
  }

  function marcarNovedadesVistas() {
    const ids = nuevos.map((p) => p.id)
    setConocidos((prev) => {
      const sig = Array.from(new Set([...prev, ...ids]))
      guardarIdsPerfil(perfil, 'conocidos', sig)
      return sig
    })
    setSoloNovedades(false)
  }

  const termino = normalizarTexto(busqueda.trim())
  const base = soloNovedades ? nuevos : activos
  const coincidencias = base.filter((p) => {
    if (!termino) return true
    const texto = normalizarTexto(`${p.nombresCompletos} ${p.especialidad} ${p.sede}`)
    return termino.split(/\s+/).every((t) => texto.includes(t))
  })
  const visibles = coincidencias.slice(0, MAX_SUGERENCIAS)

  const seleccionadosDatos = seleccionados
    .map((id) => porId.get(id))
    .filter((p): p is ProfesionalResumenDto => Boolean(p))
  const favoritosRapidos = favoritos
    .map((id) => porId.get(id))
    .filter((p): p is ProfesionalResumenDto => Boolean(p))
    .filter((p) => !seleccionados.includes(p.id))

  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Recursos</p>
        {nuevos.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSoloNovedades((v) => !v)
              setAbierto(true)
            }}
            aria-pressed={soloNovedades}
            title="Ver recursos nuevos"
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              soloNovedades
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            ✨ {nuevos.length} nuevo{nuevos.length === 1 ? '' : 's'}
          </button>
        )}
      </div>

      {/* Buscador con autocompletado */}
      <div ref={cajaRef} className="relative">
        <input
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value)
            setAbierto(true)
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setAbierto(false)
            if (e.key === 'Enter') {
              const primero = visibles.find((p) => !seleccionados.includes(p.id)) ?? visibles[0]
              if (primero) {
                alternar(primero.id)
                setAbierto(false)
              }
            }
          }}
          placeholder="Buscar por nombre, especialidad o sede…"
          aria-label="Buscar recursos"
          className="w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary sm:max-w-md"
        />
        {abierto && (
          <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-white shadow-lg sm:max-w-md">
            {soloNovedades && (
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-[11px]">
                <span className="font-semibold text-amber-800">Mostrando solo novedades</span>
                <button
                  type="button"
                  onClick={marcarNovedadesVistas}
                  className="font-medium text-primary underline"
                >
                  Marcar como vistos
                </button>
              </div>
            )}
            {visibles.length === 0 && (
              <p className="px-3 py-3 text-sm text-foreground/50">Sin coincidencias…</p>
            )}
            {visibles.map((p) => {
              const elegido = seleccionados.includes(p.id)
              const esNuevo = !conocidos.includes(p.id)
              const esFav = favoritos.includes(p.id)
              return (
                <div key={p.id} className="flex items-center gap-1 px-2 py-0.5 hover:bg-muted">
                  <button
                    type="button"
                    onClick={() => alternar(p.id)}
                    aria-pressed={elegido}
                    className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-left"
                  >
                    <span aria-hidden="true" className="text-sm">{elegido ? '☑' : '☐'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.nombresCompletos}</span>
                      {p.especialidad && (
                        <span className="block truncate text-[11px] text-foreground/60">
                          {p.especialidad}{p.sede ? ` · ${p.sede}` : ''}
                        </span>
                      )}
                    </span>
                    {esNuevo && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        Nuevo
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarFavorito(p.id)}
                    aria-label={`Favorito ${p.nombresCompletos}`}
                    aria-pressed={esFav}
                    title={esFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    className="shrink-0 px-1.5 py-1 text-base leading-none text-amber-500"
                  >
                    {esFav ? '★' : '☆'}
                  </button>
                </div>
              )
            })}
            {coincidencias.length > visibles.length && (
              <p className="px-3 py-1.5 text-[11px] text-foreground/50">
                +{coincidencias.length - visibles.length} más… refine la búsqueda
              </p>
            )}
          </div>
        )}
      </div>

      {/* Chips de seleccionados */}
      {seleccionadosDatos.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {seleccionadosDatos.map((p) => {
            const esFav = favoritos.includes(p.id)
            return (
              <span
                key={p.id}
                className="inline-flex items-center gap-0.5 rounded-full border border-primary bg-primary/10 py-1 pl-3 pr-1 text-xs font-medium"
              >
                {p.nombresCompletos}
                {p.especialidad && <span className="opacity-70"> — {p.especialidad}</span>}
                <button
                  type="button"
                  onClick={() => alternarFavorito(p.id)}
                  aria-label={`Favorito ${p.nombresCompletos}`}
                  aria-pressed={esFav}
                  className="px-1 text-sm leading-none text-amber-500"
                >
                  {esFav ? '★' : '☆'}
                </button>
                <button
                  type="button"
                  onClick={() => alternar(p.id)}
                  aria-label={`Quitar ${p.nombresCompletos}`}
                  className="rounded-full px-1.5 leading-none hover:bg-primary/20"
                >
                  ✕
                </button>
              </span>
            )
          })}
          {seleccionadosDatos.length > 1 && (
            <button
              type="button"
              onClick={() => onCambiar([])}
              className="text-[11px] text-foreground/60 underline hover:text-foreground"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Acceso rápido a favoritos no seleccionados */}
      {favoritosRapidos.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-foreground/60">Favoritos:</span>
          {favoritosRapidos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                registrarUso([p.id])
                onCambiar([...seleccionados, p.id])
              }}
              className="rounded-full border border-border px-2 py-0.5 text-[11px] hover:border-primary/50"
            >
              + {p.nombresCompletos}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componentes ─────────────────────────────────────────────

export function AgendaView({
  onCrearCita,
  fechaInicial,
  profesionalesIniciales,
  perfil,
}: {
  onCrearCita?: (hint: CitaHint) => void
  fechaInicial?: string
  profesionalesIniciales?: number[]
  perfil: PerfilId
}) {
  const { t, tf } = useCatalogo()
  // Pestaña restaurada del ambiente del perfil; valor inválido → diario.
  const [vista, setVista] = useState<VistaAgenda>(() => {
    const g = leerVistaPerfil(perfil)
    return g === 'diario' || g === 'semanal' || g === 'mensual' || g === 'lista' ? g : 'diario'
  })
  // Restaura la última selección del perfil tal como quedó (recarga o
  // regreso desde otra función); base para futuros perfiles por operador.
  const [profIds, setProfIds] = useState<number[]>(
    () => profesionalesIniciales ?? leerIdsPerfil(perfil, 'seleccion'),
  )
  const [fecha, setFecha] = useState(fechaInicial ?? hoyISO())
  const [desdeLista, setDesdeLista] = useState(lunesDeLaSemana(hoyISO()))
  const [hastaLista, setHastaLista] = useState(hoyISO())
  // Filtros por estado: se restauran del ambiente del perfil (igual que
  // la selección de recursos). Sin nada guardado, arrancan todos activos.
  const [estadosActivos, setEstadosActivos] = useState<number[]>(() => {
    const todos = ESTADOS_CITA.map((e) => e.id)
    const guardados = leerIdsPerfil(perfil, 'estados')
    if (guardados.length === 0) {
      return hayAmbienteGuardado(perfil, 'estados') ? [] : todos
    }
    const validos = guardados.filter((id) => todos.includes(id))
    return validos.length > 0 ? validos : todos
  })
  const [items, setItems] = useState<AgendaDiaItemDto[]>([])
  const [slotsPorProf, setSlotsPorProf] = useState<Record<number, SlotLibreDto[]>>({})
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sel, setSel] = useState<AgendaDiaItemDto | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [buscandoTurno, setBuscandoTurno] = useState(false)
  const [turnoEncontrado, setTurnoEncontrado] = useState<string | null>(null)
  const [profesionales, setProfesionales] = useState<ProfesionalResumenDto[]>([])
  const [tiposCita, setTiposCita] = useState<TipoCitaDto[]>([])

  useEffect(() => {
    api.profesionales().then(setProfesionales).catch(() => {})
    api.tiposCita().then(setTiposCita).catch(() => {})
  }, [])

  useEffect(() => {
    if (fechaInicial) setFecha(fechaInicial)
    if (profesionalesIniciales?.length) setProfIds(profesionalesIniciales)
  }, [fechaInicial, profesionalesIniciales])

  // Depura la selección contra la lista real (descarta borrados/inactivos).
  useEffect(() => {
    if (profesionales.length === 0) return
    setProfIds((prev) => {
      const validos = prev.filter((id) => {
        const p = profesionales.find((x) => x.id === id)
        return p && p.activo
      })
      return validos.length === prev.length ? prev : validos
    })
  }, [profesionales])

  // Persiste cada cambio para restaurar al recargar o al volver de otra función.
  useEffect(() => {
    guardarIdsPerfil(perfil, 'seleccion', profIds)
  }, [profIds, perfil])

  // Persiste los filtros por estado en el ambiente del perfil.
  useEffect(() => {
    guardarIdsPerfil(perfil, 'estados', estadosActivos)
  }, [estadosActivos, perfil])

  // Persiste la pestaña activa en el ambiente del perfil.
  useEffect(() => {
    guardarVistaPerfil(perfil, vista)
  }, [vista, perfil])

  const [desde, hasta] = useMemo(() => {
    if (vista === 'semanal') {
      const lun = lunesDeLaSemana(fecha)
      return [lun, sumarDias(lun, 6)]
    }
    if (vista === 'mensual') {
      const { primero, ultimo } = primerUltimoDiaMes(fecha)
      return [primero, ultimo]
    }
    if (vista === 'lista') return [desdeLista, hastaLista]
    return [fecha, fecha]
  }, [vista, fecha, desdeLista, hastaLista])

  useEffect(() => {
    if (profIds.length === 0) {
      setItems([])
      setSlotsPorProf({})
      return
    }
    setCargando(true)
    setError(null)
    setTurnoEncontrado(null)
    setSel(null)
    api
      .agendaRango({ profesionalesIds: profIds, fechaDesde: desde, fechaHasta: hasta })
      .then((r) => setItems(r))
      .catch((e) => setError(msgError(e)))
      .finally(() => setCargando(false))
  }, [profIds, desde, hasta, refresh])

  // Filtro por estado en memoria: alternar un chip no refetchea.
  const itemsVisibles = useMemo(
    () => items.filter((i) => estadosActivos.includes(i.estadoId)),
    [items, estadosActivos],
  )

  useEffect(() => {
    if (cargando || profIds.length === 0) return
    Promise.all(
      profIds.map(async (pid) => {
        try {
          const d = await api.disponibilidad({
            profesionalId: pid,
            fecha: desde,
            tipoCitaId: tiposCita[0]?.id ?? 1,
          })
          return [pid, d.slotsLibres] as const
        } catch {
          return [pid, []] as const
        }
      }),
    )
      .then((rs) => setSlotsPorProf(Object.fromEntries(rs)))
      .catch(() => setSlotsPorProf({}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profIds, desde, vista, refresh])

  function toggleEstado(id: number) {
    setEstadosActivos((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  // Vuelve a ventana limpia (filtros=todos, vista=diario, fecha=hoy) sin
  // tocar la selección de recursos, favoritos ni frecuentes. Los efectos
  // existentes persisten el resultado en el ambiente del perfil.
  function restablecerVista() {
    setEstadosActivos(ESTADOS_CITA.map((x) => x.id))
    setVista('diario')
    setFecha(hoyISO())
    setDesdeLista(lunesDeLaSemana(hoyISO()))
    setHastaLista(hoyISO())
  }

  async function reprogramarArrastre(citaId: number, fechaHoraNueva: string) {
    setError(null)
    try {
      await api.modificarCita(citaId, {
        nuevaFechaHora: conSegundos(fechaHoraNueva),
        motivo: 'Reprogramada por arrastre',
      })
      setSel(null)
      setRefresh((x) => x + 1)
    } catch (e) {
      setError(msgError(e))
    }
  }

  const filas: FilaAgenda[] = profIds
    .map((pid) => profesionales.find((p) => p.id === pid))
    .filter((p): p is ProfesionalResumenDto => Boolean(p))
    .map((profesional) => ({
      profesional,
      items: itemsVisibles
        .filter((i) => i.profesionalId === profesional.id)
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    }))

  async function buscarProximoTurno() {
    if (profIds.length === 0 || tiposCita.length === 0) return
    const tipoCitaId = tiposCita[0].id
    setBuscandoTurno(true)
    setError(null)
    setTurnoEncontrado(null)
    try {
      const esHoy = fecha === hoyISO()
      const ahora = new Date()
      const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
      for (let i = 0; i <= 30; i++) {
        const dia = sumarDias(fecha, i)
        for (const pid of profIds) {
          const d = await api.disponibilidad({ profesionalId: pid, fecha: dia, tipoCitaId })
          const libre = d.slotsLibres.find((s) => {
            if (!s.disponible) return false
            if (esHoy && i === 0 && s.horaInicio <= horaActual) return false
            return true
          })
          if (libre) {
            onCrearCita?.({
              fechaHora: `${dia}T${libre.horaInicio}:00`,
              profesionalId: pid,
              consultorioSala: libre.consultorioSala,
            })
            return
          }
        }
      }
      setError(t('MsgSinTurnosDisponibles'))
    } catch (e) {
      setError(msgError(e))
    } finally {
      setBuscandoTurno(false)
    }
  }

  return (
    <div>
      <Cabecera
        titulo={t('PantallaCalendario')}
        sub={t('AgendaSub')}
      />

      {/* ── Barra superior: pestañas + controles ── */}
      <div className="mb-4 rounded-xl border border-border bg-white p-4">
        {/* Línea 1: pestañas */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5" role="tablist">
            {(
              [
                ['diario', t('VistaDiario')],
                ['semanal', t('VistaSemanal')],
                ['mensual', t('VistaMensual')],
                ['lista', t('VistaLista')],
              ] as [VistaAgenda, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={vista === id}
                onClick={() => setVista(id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  vista === id ? 'bg-primary text-white' : 'text-foreground/70 hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Línea 2: navegación + acciones */}
        <div className="mt-2 flex items-center gap-2">
          {/* Navegación de fecha según vista */}
          {vista === 'diario' && (
            <>
              <button type="button" onClick={() => setFecha(sumarDias(fecha, -1))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">‹</button>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-[160px] rounded-md border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <button type="button" onClick={() => setFecha(sumarDias(fecha, 1))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">›</button>
            </>
          )}
          {vista === 'semanal' && (
            <>
              <button type="button" onClick={() => setFecha(sumarDias(fecha, -7))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">‹</button>
              <span className="text-sm font-medium whitespace-nowrap">{formatFecha(desde)} – {formatFecha(hasta)}</span>
              <button type="button" onClick={() => setFecha(sumarDias(fecha, 7))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">›</button>
            </>
          )}
          {vista === 'mensual' && (
            <>
              <button type="button" onClick={() => setFecha(sumarDias(fecha, -30))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">‹</button>
              <input type="month" value={fecha.slice(0, 7)} onChange={(e) => setFecha(e.target.value ? `${e.target.value}-01` : fecha)} className="w-[160px] rounded-md border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <button type="button" onClick={() => setFecha(sumarDias(fecha, 31))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">›</button>
            </>
          )}
          {vista === 'lista' && (
            <>
              <span className="text-sm">{t('LabelDesde')}</span>
              <input type="date" value={desdeLista} onChange={(e) => setDesdeLista(e.target.value)} className="w-[140px] rounded-md border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <span className="text-sm">{t('LabelHasta')}</span>
              <input type="date" value={hastaLista} onChange={(e) => setHastaLista(e.target.value)} className="w-[140px] rounded-md border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </>
          )}

          <button type="button" onClick={() => setFecha(hoyISO())} className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted">{t('BtnHoy')}</button>

          <button
            type="button"
            onClick={buscarProximoTurno}
            disabled={buscandoTurno || profIds.length === 0}
            className="whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {buscandoTurno ? t('MsgBuscando') : t('AccionProximoTurno')}
          </button>

          <span className="text-[11px] text-foreground/50 whitespace-nowrap">
            {t('MsgBuscarDesde')} {formatFecha(fecha)}
          </span>

          <button
            type="button"
            onClick={() => setRefresh((x) => x + 1)}
            disabled={cargando}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-50"
          >
            ↻ {t('BtnActualizar')}
          </button>
        </div>

        {/* Recursos: buscador + chips + favoritos (carga diferida) */}
        <SelectorRecursos
          profesionales={profesionales}
          seleccionados={profIds}
          perfil={perfil}
          onCambiar={setProfIds}
        />

        {/* Filtros por estado */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground/60">{t('LabelEstados')}</span>
          {ESTADOS_CITA.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => toggleEstado(e.id)}
              aria-pressed={estadosActivos.includes(e.id)}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                estadosActivos.includes(e.id)
                  ? `${estadoBadge(e.id)} border-current`
                  : 'border-border text-foreground/40'
              }`}
            >
              {t(e.clave)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEstadosActivos(ESTADOS_CITA.map((x) => x.id))}
            className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground/60 hover:bg-muted"
          >
            {t('BtnTodos')}
          </button>
          <button
            type="button"
            onClick={restablecerVista}
            className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground/60 hover:bg-muted"
          >
            Restablecer
          </button>
        </div>
      </div>

      {error && <Aviso msg={error} />}
      {turnoEncontrado && (
        <div className="mb-4">
          <Exito msg={tf('MsgProximoTurno', { turno: turnoEncontrado })} />
        </div>
      )}
      {cargando && <Spinner />}

      {!cargando && profIds.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-foreground/60">
          {t('MsgSeleccionarProfesional')}
        </div>
      )}

      {!cargando && profIds.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            {vista === 'diario' && (
              <TimelineDia
                filas={filas}
                slotsPorProf={slotsPorProf}
                fecha={fecha}
                onSeleccionar={(i) => setSel(i)}
                onCrearCita={onCrearCita}
                onReprogramar={(citaId, fhNueva) => reprogramarArrastre(citaId, fhNueva)}
              />
            )}
            {vista === 'semanal' && (
              <TimelineSemanal
                filas={filas}
                desde={desde}
                onSeleccionar={(i) => setSel(i)}
                onReprogramar={(citaId, fhNueva) => reprogramarArrastre(citaId, fhNueva)}
              />
            )}
            {vista === 'mensual' && (
              <TimelineMensual
                items={itemsVisibles}
                fecha={fecha}
                onDia={(d) => {
                  setVista('diario')
                  setFecha(d)
                }}
                onSeleccionar={(i) => setSel(i)}
              />
            )}
            {vista === 'lista' && <VistaLista items={itemsVisibles} onSeleccionar={(i) => setSel(i)} />}
          </div>

          <aside className="min-w-0">
            <PanelDetalleCita
              cita={sel}
              onCerrar={() => setSel(null)}
              onChange={() => setRefresh((r) => r + 1)}
            />
          </aside>
        </div>
      )}
    </div>
  )
}

/** Línea de tiempo diaria: fila por profesional, bloques posicionados por hora. */
function TimelineDia({
  filas,
  slotsPorProf,
  fecha,
  onSeleccionar,
  onCrearCita,
  onReprogramar,
}: {
  filas: FilaAgenda[]
  slotsPorProf: Record<number, SlotLibreDto[]>
  fecha: string
  onSeleccionar: (i: AgendaDiaItemDto) => void
  onCrearCita?: (hint: CitaHint) => void
  onReprogramar?: (citaId: number, fechaHoraNueva: string) => void | Promise<void>
}) {
  const { t } = useCatalogo()
  const todas = filas.flatMap((f) => f.items)

  const REPROGRAMABLES = new Set([1, 2])
  const [arrastrando, setArrastrando] = useState<number | null>(null)

  function alSoltarSlots(s: SlotLibreDto, citaId: number | null) {
    if (!citaId || !onReprogramar) return
    void onReprogramar(citaId, `${fecha}T${s.horaInicio}:00`)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div
            className="relative border-b border-border bg-muted"
            style={{ height: 44, marginLeft: ANCHO_COL, width: ANCHO_ESCALA }}
          >
            <span
              className="absolute top-1/2 w-12 -translate-y-1/2 text-xs font-medium text-foreground/60"
              style={{ left: 0 }}
            >
              06:00
            </span>
            {horasEje.slice(1).map((h) => (
              <span
                key={h}
                className="absolute top-1/2 w-12 -translate-y-1/2 text-xs font-medium text-foreground/60"
                style={{ left: pxHora(h) }}
              >
                {`${String(Math.floor(h / 60)).padStart(2, '0')}:00`}
              </span>
            ))}
          </div>

          {todas.length === 0 && (
            <div className="p-10 text-center text-sm text-foreground/60">
              {t('MsgSinCitasFecha')}
            </div>
          )}

          {filas.map((f) => (
            <div key={f.profesional.id} className="relative border-t border-border">
              <div
                className="absolute inset-y-0 left-0 z-10 bg-background px-3 py-2"
                style={{ width: ANCHO_COL, borderRight: '1px solid var(--border)' }}
              >
                <p className="truncate text-sm font-semibold">{f.profesional.nombresCompletos}</p>
                <p className="truncate text-xs text-foreground/60">{f.profesional.especialidad}</p>
              </div>
              <div className="relative" style={{ marginLeft: ANCHO_COL, height: 76, width: ANCHO_ESCALA }}>
                {horasEje.map((h) => (
                  <span
                    key={h}
                    className="pointer-events-none absolute inset-y-0 border-l border-border/60"
                    style={{ left: pxHora(h) }}
                  />
                ))}

                {/* Slots libres (haz clic para crear cita allí) */}
                {(slotsPorProf[f.profesional.id] ?? [])
                  .filter((s) => s.disponible)
                  .map((s, idx) => {
                    const inicio = aMinutos(s.horaInicio)
                    const fin = aMinutos(s.horaFin) || inicio
                    const left = pxHora(inicio)
                    const ancho = Math.max(16, pxHora(fin) - pxHora(inicio))
                    return (
                      <button
                        key={`slot-${idx}`}
                        type="button"
                        onClick={() =>
                          onCrearCita?.({
                            fechaHora: `${fecha}T${s.horaInicio}:00`,
                            profesionalId: f.profesional.id,
                            consultorioSala: s.consultorioSala,
                          })
                        }
                        onDragOver={(e) => {
                          if (arrastrando) e.preventDefault()
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          alSoltarSlots(s, arrastrando)
                          setArrastrando(null)
                        }}
                        title={`Libre ${s.horaInicio}–${s.horaFin} · hacer clic para agendar${arrastrando ? ' · soltar para reprogramar' : ''}`}
                        className="absolute top-1.5 flex items-center justify-center overflow-hidden rounded-md border border-dashed border-emerald-300 bg-emerald-50/70 text-center text-[10px] font-medium text-emerald-700 transition-colors hover:border-emerald-500 hover:bg-emerald-100"
                        style={{ left, width: ancho, minWidth: 16, height: 64 }}
                      >
                        <span className="truncate">{ancho >= 34 ? s.horaInicio : '+'}</span>
                      </button>
                    )
                  })}

                {/* Citas */}
                {f.items.map((i) => {
                  const inicio = aMinutos(i.horaInicio)
                  const fin = aMinutos(i.horaFin) || inicio
                  const left = pxHora(inicio)
                  const ancho = Math.max(20, pxHora(fin) - pxHora(inicio))
                  return (
                    <div
                      key={i.citaId}
                      className="absolute"
                      style={{ left, width: ancho, minWidth: 20, top: 4 }}
                    >
                      <MenuTresPuntos onDetalle={() => onSeleccionar(i)} />
                      <button
                        type="button"
                        draggable={REPROGRAMABLES.has(i.estadoId) && Boolean(onReprogramar)}
                        onDragStart={(e) => {
                          setArrastrando(i.citaId)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', String(i.citaId))
                        }}
                        onDragEnd={() => setArrastrando(null)}
                        onClick={() => onSeleccionar(i)}
                        title={`${i.horaInicio}–${i.horaFin} · ${i.paciente}${REPROGRAMABLES.has(i.estadoId) && onReprogramar ? ' · arrastrar para reprogramar' : ''}`}
                        className="flex h-[64px] w-full flex-col overflow-hidden rounded-md border px-2 py-1 text-left text-[11px] leading-tight transition-colors hover:z-20 hover:brightness-95"
                        style={{
                          borderColor: 'currentColor',
                          backgroundColor: 'color-mix(in srgb, currentColor 12%, white)',
                          color: colorEstado(i.estadoId),
                          ...(arrastrando === i.citaId
                            ? { opacity: 0.4, boxShadow: '0 0 0 2px rgba(2,132,199,0.4)' }
                            : {}),
                        }}
                      >
                        <span className="flex items-center justify-between gap-1 font-medium">
                          <span>{i.horaInicio}</span>
                          <span className={`rounded-full border px-1.5 py-px text-[9px] ${estadoBadge(i.estadoId)}`}>
                            {i.estado}
                          </span>
                        </span>
                        <span className="truncate font-semibold">{i.paciente}</span>
                        <span className="truncate opacity-75">
                          {i.tipoCita} · {i.identificacion}
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Menú contextual de 3 puntos por bloque. */
function MenuTresPuntos({ onDetalle }: { onDetalle: () => void }) {
  const { t } = useCatalogo()
  const [abierto, setAbierto] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onFuera(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', onFuera)
    return () => document.removeEventListener('mousedown', onFuera)
  }, [])

  return (
    <div ref={wrapRef} className="absolute -top-1 right-1 z-30">
      <button
        type="button"
        aria-label="Opciones"
        onClick={(e) => {
          e.stopPropagation()
          setAbierto((x) => !x)
        }}
        className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-foreground/60 shadow-sm ring-1 ring-border hover:text-foreground"
      >
        ⋯
      </button>
      {abierto && (
        <div className="absolute right-0 z-40 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs hover:bg-muted"
            onClick={() => {
              setAbierto(false)
              onDetalle()
            }}
          >
            {t('AccionVerDetalle')}
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs text-rose-700 hover:bg-rose-50"
            onClick={() => {
              setAbierto(false)
              onDetalle()
            }}
          >
            {t('AccionEstado')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Semana: columnas por día, fila por profesional. */
function TimelineSemanal({
  filas,
  desde,
  onSeleccionar,
  onReprogramar,
}: {
  filas: FilaAgenda[]
  desde: string
  onSeleccionar: (i: AgendaDiaItemDto) => void
  onReprogramar?: (citaId: number, fechaHoraNueva: string) => void | Promise<void>
}) {
  const { t } = useCatalogo()
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(desde, i))
  const REPROGRAMABLES = new Set([1, 2])
  const [arrastre, setArrastre] = useState<{ citaId: number; hora: string } | null>(null)
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
              <th className="px-3 py-3">{t('DetalleProfesional')}</th>
              {dias.map((d) => (
                <th key={d} className="px-2 py-3 text-center">
                  {diaANombre(new Date(`${d}T00:00:00`))} {new Date(`${d}T00:00:00`).getDate()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.profesional.id} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  <span className="font-medium">{f.profesional.nombresCompletos}</span>
                  <span className="block text-xs text-foreground/60">{f.profesional.especialidad}</span>
                </td>
                {dias.map((d) => {
                  const delDia = f.items.filter((i) => i.fecha === d)
                  return (
                    <td
                      key={d}
                      onDragOver={(e) => {
                        if (arrastre) e.preventDefault()
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (arrastre && onReprogramar) {
                          void onReprogramar(arrastre.citaId, `${d}T${arrastre.hora}:00`)
                        }
                        setArrastre(null)
                      }}
                      className={`min-w-[120px] space-y-1 px-1 py-2 align-top transition-colors ${
                        arrastre ? 'bg-emerald-50/60 ring-2 ring-inset ring-emerald-300' : ''
                      }`}
                      title={arrastre ? `Soltar en ${diaANombre(new Date(`${d}T00:00:00`))} para reprogramar` : undefined}
                    >
                      {delDia.length === 0 && <span className="text-[11px] text-foreground/30">—</span>}
                      {delDia.map((i) => (
                        <button
                          key={i.citaId}
                          type="button"
                          draggable={REPROGRAMABLES.has(i.estadoId) && Boolean(onReprogramar)}
                          onDragStart={(e) => {
                            setArrastre({ citaId: i.citaId, hora: i.horaInicio })
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', String(i.citaId))
                          }}
                          onDragEnd={() => setArrastre(null)}
                          onClick={() => onSeleccionar(i)}
                          title={`${i.horaInicio}–${i.horaFin} · ${i.paciente}${REPROGRAMABLES.has(i.estadoId) && onReprogramar ? ' · arrastrar a otro día para reprogramar' : ''}`}
                          className="block w-full rounded border px-2 py-1 text-left text-[11px] leading-tight hover:brightness-95"
                          style={{
                            borderColor: 'currentColor',
                            backgroundColor: 'color-mix(in srgb, currentColor 10%, white)',
                            color: colorEstado(i.estadoId),
                          }}
                        >
                          <span className="flex items-center justify-between gap-1">
                            <span className="font-semibold">{i.horaInicio}</span>
                            <span className={`rounded-full border px-1 text-[8px] ${estadoBadge(i.estadoId)}`}>
                              {i.estado}
                            </span>
                          </span>
                          <span className="truncate">{i.paciente}</span>
                        </button>
                      ))}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Mes: rejilla de días; cada celda lista las citas del día. */
function TimelineMensual({
  items,
  fecha,
  onDia,
  onSeleccionar,
}: {
  items: AgendaDiaItemDto[]
  fecha: string
  onDia: (dia: string) => void
  onSeleccionar: (i: AgendaDiaItemDto) => void
}) {
  const { t } = useCatalogo()
  const { primero, ultimo } = primerUltimoDiaMes(fecha)
  const inicioSem = new Date(`${primero}T00:00:00`)
  const offset = inicioSem.getDay() === 0 ? 6 : inicioSem.getDay() - 1
  const inicio = new Date(`${primero}T00:00:00`)
  inicio.setDate(inicio.getDate() - offset)
  const ultimoDia = new Date(`${ultimo}T00:00:00`)
  const celdas: string[] = []
  let cursor = new Date(inicio)
  while (cursor <= ultimoDia) {
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    celdas.push(`${cursor.getFullYear()}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 1)
  }

  const enMes = (dia: string) => dia >= primero && dia <= ultimo

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="grid grid-cols-7 border-b border-border bg-muted text-center text-xs font-medium uppercase tracking-wide text-foreground/60">
        {[t('DiaLunes'), t('DiaMartes'), t('DiaMiercoles'), t('DiaJueves'), t('DiaViernes'), t('DiaSabado'), t('DiaDomingo')].map((d) => (
          <div key={d} className="py-2">{d.slice(0, 3)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {celdas.map((dia) => {
          const delDia = items.filter((i) => i.fecha === dia)
          return (
            <div
              key={dia}
              className={`min-h-[70px] border-b border-r border-border p-1 ${
                enMes(dia) ? '' : 'bg-muted/40'
              }`}
            >
              <button
                type="button"
                onClick={() => onDia(dia)}
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  dia === hoyISO()
                    ? 'bg-primary font-bold text-white'
                    : enMes(dia)
                      ? 'text-foreground/80 hover:bg-muted'
                      : 'text-foreground/30'
                }`}
              >
                {new Date(`${dia}T00:00:00`).getDate()}
              </button>
              <div className="space-y-0.5">
                {delDia.slice(0, 3).map((i) => (
                  <button
                    key={i.citaId}
                    type="button"
                    onClick={() => onSeleccionar(i)}
                    title={`${i.profesionalNombre} · ${i.horaInicio}–${i.horaFin} · ${i.paciente}`}
                    className="block w-full truncate rounded px-1 text-left text-[10px] leading-tight hover:brightness-95"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${colorEstado(i.estadoId)} 14%, white)`,
                      color: colorEstado(i.estadoId),
                    }}
                  >
                    {i.horaInicio} {i.paciente}
                  </button>
                ))}
                {delDia.length > 3 && (
                  <span className="block text-[10px] text-foreground/50">+{delDia.length - 3}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Vista lista: tabla de citas ordenada. */
function VistaLista({
  items,
  onSeleccionar,
}: {
  items: AgendaDiaItemDto[]
  onSeleccionar: (i: AgendaDiaItemDto) => void
}) {
  const { t } = useCatalogo()
  if (items.length === 0)
    return (
      <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-foreground/60">
        {t('MsgSinCitasRango')}
      </div>
    )
  const ordenados = [...items].sort((a, b) =>
    `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`),
  )
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
              <th className="px-4 py-3">{t('DetalleFecha')}</th>
              <th className="px-4 py-3">{t('ColHora')}</th>
              <th className="px-4 py-3">{t('DetalleProfesional')}</th>
              <th className="px-4 py-3">{t('DetallePaciente')}</th>
              <th className="px-4 py-3">{t('DetalleTipoCita')}</th>
              <th className="px-4 py-3">{t('ColEstado')}</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((i) => (
              <tr
                key={i.citaId}
                onClick={() => onSeleccionar(i)}
                className="cursor-pointer border-t border-border first:border-t-0 hover:bg-muted/40"
              >
                <td className="whitespace-nowrap px-4 py-3">{formatFecha(i.fecha)}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold">{i.horaInicio}</td>
                <td className="px-4 py-3">{i.profesionalNombre}</td>
                <td className="px-4 py-3">{i.paciente}</td>
                <td className="px-4 py-3">{i.tipoCita}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${estadoBadge(i.estadoId)}`}>
                    {i.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  PANEL LATERAL DE DETALLE (Fase 2 — item 6)
// ══════════════════════════════════════════════════════════════
function PanelDetalleCita({
  cita,
  onCerrar,
  onChange,
}: {
  cita: AgendaDiaItemDto | null
  onCerrar: () => void
  onChange: () => void
}) {
  const { t } = useCatalogo()
  const [detalle, setDetalle] = useState<CitaDto | null>(null)
  const [historial, setHistorial] = useState<HistorialEstadoDto[]>([])
  const [cargando, setCargando] = useState(false)
  const [accion, setAccion] = useState<'confirmar' | 'iniciar' | 'realizar' | 'noasistio' | 'reprogramar' | 'cancelar' | null>(null)
  const [motivo, setMotivo] = useState('')
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [motivoOtro, setMotivoOtro] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [motivosCancelacion, setMotivosCancelacion] = useState<MotivoCancelacionDto[]>([])
  const [enDesarrollo, setEnDesarrollo] = useState(false)
  const [verDetalle, setVerDetalle] = useState(false)

  useEffect(() => {
    api.motivosCancelacion().then(setMotivosCancelacion).catch(() => {})
  }, [])

  useEffect(() => {
    if (!cita) {
      setDetalle(null)
      setHistorial([])
      setAccion(null)
      setError(null)
      setVerDetalle(false)
      return
    }
    setCargando(true)
    setError(null)
    setAccion(null)
    setVerDetalle(false)
    api
      .cita(cita.citaId)
      .then((c) => {
        setDetalle(c)
        setNuevaFecha(c.fechaHora.slice(0, 16))
        return api.historialCita(c.id)
      })
      .then(setHistorial)
      .catch((e) => setError(msgError(e)))
      .finally(() => setCargando(false))
  }, [cita?.citaId])

  if (!cita) {
    return (
      <div className="rounded-lg border border-border bg-white p-6 text-center text-sm text-foreground/60">
        {t('MsgSeleccionarCita')}
      </div>
    )
  }

  async function ejecutarAccion(): Promise<void> {
    if (!detalle) return
    if (accion === 'iniciar') {
      setAccion(null)
      setEnDesarrollo(true)
      onChange()
      return
    }
    setEnviando(true)
    setError(null)
    try {
      if (accion === 'cancelar') {
        const motivoFinal = motivoCancelacion === 'Otro' ? motivoOtro.trim() : motivoCancelacion
        if (!motivoFinal) {
          setError(t('MsgCancelacionRequiereMotivo'))
          setEnviando(false)
          return
        }
        await api.cancelarCita(detalle.id, { motivo: motivoFinal })
      } else if (accion === 'reprogramar') {
        if (!nuevaFecha) {
          setError(t('MsgSeleccionarNuevaFecha'))
          setEnviando(false)
          return
        }
        await api.modificarCita(detalle.id, {
          nuevaFechaHora: conSegundos(nuevaFecha),
          motivo: motivo || null,
        })
      } else if (accion) {
        await api.cambiarEstadoCita(detalle.id, {
          nuevoEstadoId: {
            confirmar: 2,
            iniciar: 3,
            realizar: 4,
            noasistio: 6,
          }[accion],
          motivo: motivo || null,
        })
      }
      setMotivo('')
      setMotivoCancelacion('')
      setMotivoOtro('')
      setAccion(null)
      onChange()
      const c = await api.cita(detalle.id)
      setDetalle(c)
      setHistorial(await api.historialCita(c.id))
    } catch (e) {
      setError(msgError(e))
    } finally {
      setEnviando(false)
    }
  }

  const acciones: { id: 'confirmar' | 'iniciar' | 'realizar' | 'noasistio'; label: string }[] = []
  if ([1, 7].includes(cita.estadoId)) acciones.push({ id: 'confirmar', label: t('AccionConfirmar') })
  if ([1, 2, 7].includes(cita.estadoId)) acciones.push({ id: 'iniciar', label: t('AccionIniciarAtencion') })
  if ([2].includes(cita.estadoId)) acciones.push({ id: 'noasistio', label: t('AccionNoAsistio') })
  if ([3].includes(cita.estadoId)) acciones.push({ id: 'realizar', label: t('AccionMarcarRealizada') })

  return (
    <div className="sticky top-4">
      {enDesarrollo && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-center">
          <p className="text-sm font-semibold text-amber-800">{t('MsgEnDesarrollo')}</p>
          <button
            type="button"
            onClick={() => { setEnDesarrollo(false); onCerrar() }}
            className="mt-3 rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
          >
            {t('BtnVolverAgenda')}
          </button>
        </div>
      )}
      {/* Acciones del ciclo de vida */}
      <div className="mb-3 rounded-lg border border-border bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">{t('LabelAcciones')}</p>
        <div className="flex flex-wrap gap-2">
          {acciones.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccion(a.id)}
              className="rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              {a.label}
            </button>
          ))}
          {[1, 2, 7].includes(cita.estadoId) && (
            <button
              type="button"
              onClick={() => setAccion('reprogramar')}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-muted"
            >
              {t('AccionReprogramar')}
            </button>
          )}
          {[1, 2, 3, 7].includes(cita.estadoId) && (
            <button
              type="button"
              onClick={() => setAccion('cancelar')}
              className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              {t('AccionCancelarCita')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setVerDetalle(true)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-muted"
          >
            {t('AccionVerDetalle') ?? 'Ver Detalle'}
          </button>
        </div>

        {accion && accion !== 'cancelar' && accion !== 'iniciar' && (
          <form
            className="mt-3 rounded-md border border-border bg-muted/40 p-3"
            onSubmit={(e) => {
              e.preventDefault()
              void ejecutarAccion()
            }}
          >
            {accion === 'reprogramar' && (
              <label className="block text-sm font-medium">
                {t('LabelNuevaFechaHora')}
                <input
                  type="datetime-local"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className={inputCls}
                />
              </label>
            )}
            {accion === 'reprogramar' && (
              <label className="mt-2 block text-sm font-medium">
                {t('LabelMotivoOpcional')}
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className={inputCls}
                  placeholder={t('PlaceholderMotivoReprogramacion')}
                />
              </label>
            )}
            {accion === 'noasistio' && (
              <p className="text-xs text-foreground/60">
                {t('MsgMarcaraNoAsistio')}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                disabled={enviando}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {enviando ? t('MsgGuardando') : t('BtnConfirmarAccion')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccion(null)
                  setError(null)
                  setMotivo('')
                  setMotivoCancelacion('')
                  setMotivoOtro('')
                }}
                className="rounded-md border border-border px-4 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-muted"
              >
                {t('BtnCancelar')}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Resumen compacto de la cita */}
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t('DetalleCita')}#{cita.citaId}</h2>
            <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${estadoBadge(cita.estadoId)}`}>
              {cita.estado}
            </span>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-md border border-border px-2 py-0.5 text-sm hover:bg-muted"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-3">
            <Aviso msg={error} />
          </div>
        )}

        {cargando || !detalle ? (
          <Spinner texto={t('MsgCargandoDetalle')} />
        ) : (
          <dl className="space-y-1.5 text-sm">
            <FilaDetalle k={t('DetalleFecha')} v={`${formatFecha(cita.fecha)} · ${cita.horaInicio}–${cita.horaFin}`} />
            <FilaDetalle k={t('DetallePaciente')} v={`${cita.paciente} (${cita.identificacion})`} />
            <FilaDetalle k={t('DetalleEdad')} v={`${cita.edadPaciente} ${t('UnidadAnios')} · ${cita.sexo === 'M' ? 'M' : 'F'}`} />
            <FilaDetalle k={t('DetalleProfesional')} v={`${cita.profesionalNombre}${cita.especialidad ? ` · ${cita.especialidad}` : ''}`} />
            <FilaDetalle k={t('DetalleTipoCita')} v={`${cita.tipoCita} · ${cita.duracionMinutos} min`} />
            <FilaDetalle k={t('DetalleAseguradora')} v={cita.aseguradora ?? '—'} />
          </dl>
        )}
      </div>

      {/* Modal de detalle completo */}
      {verDetalle && detalle && (
        <DetalleCitaCompleto
          cita={detalle}
          historial={historial}
          onCerrar={() => setVerDetalle(false)}
        />
      )}

      {/* Modal de cancelación */}
      {accion === 'cancelar' && detalle && (
        <ModalCancelarCita
          citaId={detalle.id}
          motivos={motivosCancelacion}
          onCancelar={() => { setAccion(null); setError(null); setMotivoCancelacion(''); setMotivoOtro('') }}
          onExito={() => {
            setAccion(null)
            setMotivoCancelacion('')
            setMotivoOtro('')
            setError(null)
            onChange()
            void api.cita(detalle.id).then((c) => {
              setDetalle(c)
              return api.historialCita(c.id)
            }).then(setHistorial)
          }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  MODAL DE DETALLE COMPLETO DE CITA (2 columnas)
// ══════════════════════════════════════════════════════════════
function DetalleCitaCompleto({
  cita,
  historial,
  onCerrar,
}: {
  cita: CitaDto
  historial: HistorialEstadoDto[]
  onCerrar: () => void
}) {
  const { t } = useCatalogo()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCerrar])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{t('DetalleCita')}#{cita.id}</h2>
            <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${estadoBadge(cita.estadoId)}`}>
              {cita.estado}
            </span>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 hover:bg-muted"
          >
            ✕ Volver
          </button>
        </div>

        {/* Contenido: 2 columnas */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Columna izquierda: detalle */}
          <div className="w-1/2 overflow-y-auto border-r border-border p-6">
            <dl className="space-y-3 text-sm">
              <FilaDetalle k={t('DetalleFecha')} v={`${formatFecha(cita.fechaHora.slice(0, 10))} · ${cita.fechaHora.slice(11, 16)}–${cita.fechaHoraFin?.slice(11, 16) ?? ''}`} />
              <FilaDetalle k={t('DetallePaciente')} v={`${cita.paciente?.nombresCompletos ?? ''} (${cita.paciente?.numeroIdentificacion ?? ''})`} />
              <FilaDetalle k={t('DetalleEdad')} v={`${cita.paciente?.edadAnios ?? ''} ${t('UnidadAnios')} · ${cita.paciente?.sexo === 'M' ? 'M' : 'F'}`} />
              <FilaDetalle k={t('DetalleProfesional')} v={`${cita.profesional?.nombresCompletos ?? ''}${cita.profesional?.especialidad ? ` · ${cita.profesional.especialidad}` : ''}`} />
              <FilaDetalle k={t('DetalleTipoCita')} v={`${cita.tipoCita?.nombre ?? ''} · ${cita.tipoCita?.duracionMinutos ?? ''} min`} />
              <FilaDetalle k={t('DetalleAseguradora')} v={cita.aseguradora?.nombre ?? '—'} />
              <FilaDetalle k={t('DetalleRegimen')} v={cita.tipoUsuario?.nombre ?? '—'} />
              <FilaDetalle k={t('DetalleMotivo')} v={cita.motivoConsulta ?? '—'} />
              <FilaDetalle k={t('DetalleObservaciones')} v={cita.observaciones ?? '—'} />
              {cita.teamsJoinUrl && (
                <div className="pt-1">
                  <a
                    href={cita.teamsJoinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t('BtnUnirseTeams')}
                  </a>
                </div>
              )}
            </dl>
          </div>

          {/* Columna derecha: historial */}
          <div className="flex w-1/2 flex-col overflow-hidden p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/60">{t('LabelHistorial')} ({historial.length})</p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {historial.length === 0 ? (
                <p className="text-sm text-foreground/50">{t('MsgSinCambios')}</p>
              ) : (
                <ul className="relative space-y-3 pl-4">
                  {historial.map((h) => (
                    <li key={h.id} className="relative border-l border-border pl-3">
                      <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs">
                        <span className="font-semibold">{h.estadoNuevo}</span>
                        {h.estadoAnterior && <span className="text-foreground/50"> ({t('MsgDesde')} {h.estadoAnterior})</span>}
                      </p>
                      <p className="text-[11px] text-foreground/50">
                        {formatFechaHora(h.fechaCambio)} · {h.cambiadoPor} · {h.origen}
                      </p>
                      {h.motivo && <p className="text-[11px] text-foreground/60">«{h.motivo}»</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ══════════════════════════════════════════════════════════════
//  MODAL DE CANCELACIÓN DE CITA
// ══════════════════════════════════════════════════════════════
function ModalCancelarCita({
  citaId,
  motivos,
  onCancelar,
  onExito,
}: {
  citaId: number
  motivos: MotivoCancelacionDto[]
  onCancelar: () => void
  onExito: () => void
}) {
  const { t } = useCatalogo()
  const botonRef = useRef<HTMLButtonElement | null>(null)
  const [motivoSeleccion, setMotivoSeleccion] = useState('')
  const [motivoOtro, setMotivoOtro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    botonRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!enviando) onCancelar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancelar, enviando])

  async function confirmar(): Promise<void> {
    const motivoFinal = motivoSeleccion === 'Otro' ? motivoOtro.trim() : motivoSeleccion
    if (!motivoFinal) {
      setError(t('MsgCancelacionRequiereMotivo'))
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await api.cancelarCita(citaId, { motivo: motivoFinal })
      setExito(true)
    } catch (e) {
      setError(msgError(e))
    } finally {
      setEnviando(false)
    }
  }

  if (exito) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onExito}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('TituloCitaCancelada')}
          className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">{t('TituloCitaCancelada')}</p>
          <p className="mt-3 text-sm text-foreground/70">{t('MsgCitaCanceladaExito')}</p>
          <button
            type="button"
            onClick={onExito}
            className="mt-5 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            {t('BtnOk')}
          </button>
          <p className="mt-2 text-center text-[11px] text-foreground/50">{t('MsgEnterCerrar')}</p>
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => { if (!enviando) onCancelar() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('TituloCancelarCita')}
        className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-700">{t('TituloCancelarCita')}</p>
        <p className="mt-1 text-xs text-foreground/50">{t('DetalleCita')}#{citaId}</p>

        {error && (
          <div className="mt-3">
            <Aviso msg={error} />
          </div>
        )}

        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            {t('LabelMotivoCancelacion')}
            <select
              value={motivoSeleccion}
              onChange={(e) => { setMotivoSeleccion(e.target.value); setMotivoOtro('') }}
              className={inputCls}
              disabled={enviando}
            >
              <option value="">{t('PlaceholderSeleccionarMotivo')}</option>
              {motivos.map((m) => (
                <option key={m.id} value={m.nombre}>{m.nombre}</option>
              ))}
            </select>
          </label>
          {motivoSeleccion === 'Otro' && (
            <label className="block text-sm font-medium">
              {t('LabelEspecificarMotivo')}
              <textarea
                value={motivoOtro}
                onChange={(e) => setMotivoOtro(e.target.value)}
                className={inputCls}
                rows={2}
                placeholder={t('PlaceholderDescripcionCancelacion')}
                disabled={enviando}
              />
            </label>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            ref={botonRef}
            type="button"
            onClick={confirmar}
            disabled={enviando}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {enviando ? t('MsgCancelando') : t('BtnConfirmarCancelacion')}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            disabled={enviando}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-muted disabled:opacity-60"
          >
            {t('BtnCancelar')}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-foreground/50">{t('MsgEscCerrar')}</p>
      </div>
    </div>,
    document.body,
  )
}
