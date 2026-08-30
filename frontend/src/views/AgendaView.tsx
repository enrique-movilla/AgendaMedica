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

// ── Componentes ─────────────────────────────────────────────

export function AgendaView({
  onCrearCita,
  fechaInicial,
  profesionalesIniciales,
}: {
  onCrearCita?: (hint: CitaHint) => void
  fechaInicial?: string
  profesionalesIniciales?: number[]
}) {
  const { t, tf } = useCatalogo()
  const [vista, setVista] = useState<VistaAgenda>('diario')
  const [profIds, setProfIds] = useState<number[]>(profesionalesIniciales ?? [])
  const [fecha, setFecha] = useState(fechaInicial ?? hoyISO())
  const [desdeLista, setDesdeLista] = useState(lunesDeLaSemana(hoyISO()))
  const [hastaLista, setHastaLista] = useState(hoyISO())
  const [estadosActivos, setEstadosActivos] = useState<number[]>(ESTADOS_CITA.map((e) => e.id))
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
      .then((r) =>
        setItems(r.filter((i) => estadosActivos.includes(i.estadoId))),
      )
      .catch((e) => setError(msgError(e)))
      .finally(() => setCargando(false))
  }, [profIds, desde, hasta, estadosActivos, refresh])

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

  function toggleProf(id: number) {
    setProfIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleEstado(id: number) {
    setEstadosActivos((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
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
      items: items
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
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
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
              <input type="month" value={fecha.slice(0, 7)} onChange={(e) => setFecha(e.target.value ? `${e.target.value}-01` : fecha)} className={inputCls} />
              <button type="button" onClick={() => setFecha(sumarDias(fecha, 31))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">›</button>
            </>
          )}
          {vista === 'lista' && (
            <>
              <span className="text-sm">{t('LabelDesde')}</span>
              <input type="date" value={desdeLista} onChange={(e) => setDesdeLista(e.target.value)} className={inputCls} />
              <span className="text-sm">{t('LabelHasta')}</span>
              <input type="date" value={hastaLista} onChange={(e) => setHastaLista(e.target.value)} className={inputCls} />
            </>
          )}

          <button type="button" onClick={() => setFecha(hoyISO())} className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted">{t('BtnHoy')}</button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={buscarProximoTurno}
              disabled={buscandoTurno || profIds.length === 0}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {buscandoTurno ? t('MsgBuscando') : t('AccionProximoTurno')}
            </button>
            <span className="text-[11px] text-foreground/50 whitespace-nowrap">
              {t('MsgBuscarDesde')} {formatFecha(fecha)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setRefresh((x) => x + 1)}
            disabled={cargando}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-50"
          >
            ↻ {t('BtnActualizar')}
          </button>
        </div>

        {/* Profesionales (multi-recurso a demanda) */}
        <div className="mt-3">
          <p className="mb-2 text-sm font-medium">{t('LabelProfesionales')}</p>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {profesionales.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProf(p.id)}
                aria-pressed={profIds.includes(p.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  profIds.includes(p.id)
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-white text-foreground/80 hover:border-primary/50'
                }`}
              >
                {p.nombresCompletos}
                {p.especialidad && <span className="opacity-70"> — {p.especialidad}</span>}
              </button>
            ))}
          </div>
        </div>

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
                items={items}
                fecha={fecha}
                onDia={(d) => {
                  setVista('diario')
                  setFecha(d)
                }}
                onSeleccionar={(i) => setSel(i)}
              />
            )}
            {vista === 'lista' && <VistaLista items={items} onSeleccionar={(i) => setSel(i)} />}
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

  useEffect(() => {
    api.motivosCancelacion().then(setMotivosCancelacion).catch(() => {})
  }, [])

  useEffect(() => {
    if (!cita) {
      setDetalle(null)
      setHistorial([])
      setAccion(null)
      setError(null)
      return
    }
    setCargando(true)
    setError(null)
    setAccion(null)
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
      {/* Acciones del ciclo de vida — fuera del cuadro de detalle */}
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

      {/* Cuadro de detalle de la cita */}
      <div className="rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
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
          <>
            <dl className="space-y-2 text-sm">
              <FilaDetalle k={t('DetalleFecha')} v={`${formatFecha(cita.fecha)} · ${cita.horaInicio}–${cita.horaFin}`} />
              <FilaDetalle k={t('DetallePaciente')} v={`${cita.paciente} (${cita.identificacion})`} />
              <FilaDetalle k={t('DetalleEdad')} v={`${cita.edadPaciente} ${t('UnidadAnios')} · ${cita.sexo === 'M' ? 'M' : 'F'}`} />
              <FilaDetalle k={t('DetalleProfesional')} v={`${cita.profesionalNombre}${cita.especialidad ? ` · ${cita.especialidad}` : ''}`} />
              <FilaDetalle k={t('DetalleTipoCita')} v={`${cita.tipoCita} · ${cita.duracionMinutos} min`} />
              <FilaDetalle k={t('DetalleAseguradora')} v={cita.aseguradora ?? '—'} />
              <FilaDetalle k={t('DetalleRegimen')} v={cita.regimen ?? '—'} />
              <FilaDetalle k={t('DetalleMotivo')} v={cita.motivoConsulta ?? '—'} />
              <FilaDetalle k={t('DetalleObservaciones')} v={detalle.observaciones ?? '—'} />
              {detalle.teamsJoinUrl && (
                <div className="pt-1">
                  <a
                    href={detalle.teamsJoinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t('BtnUnirseTeams')}
                  </a>
                </div>
              )}
            </dl>

            {/* Historial */}
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">{t('LabelHistorial')} ({historial.length})</p>
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
          </>
        )}
      </div>

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
