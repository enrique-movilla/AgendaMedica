import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api, ApiError } from './lib/api'
import { useConfigBusqueda } from './lib/configBusqueda'
import BuscadorAseguradora from './components/BuscadorAseguradora'
import VentanaConfigBusqueda from './components/VentanaConfigBusqueda'
import type {
  ActualizarDisponibilidadRequest,
  AgendaDiaItemDto,
  AseguradoraDto,
  BloqueoAgendaDto,
  CatalogoDefinicion,
  CatalogoFila,
  CitaDto,
  CrearBloqueoAgendaRequest,
  CrearExcepcionHorariaRequest,
  CrearProfesionalRequest,
  DependenciaCatalogo,
  DisponibilidadProfesionalDto,
  EspecialidadDto,
  ExcepcionHorariaDto,
  HistorialEstadoDto,
  MotivoCancelacionDto,
  PacienteDto,
  PacienteListaDto,
  ProfesionalResumenDto,
  ResultadoCatalogo,
  SedeDto,
  SlotLibreDto,
  TipoCitaDto,
  TipoIdentificacionDto,
  TipoUsuarioDto,
} from './lib/types'

type Vista = 'agenda' | 'nueva-cita' | 'pacientes' | 'profesionales' | 'disponibilidad' | 'catalogos'

const NAV: { id: Vista; label: string }[] = [
  { id: 'agenda', label: 'Agenda del día' },
  { id: 'nueva-cita', label: 'Nueva cita' },
  { id: 'pacientes', label: 'Pacientes' },
  { id: 'profesionales', label: 'Profesionales' },
  { id: 'disponibilidad', label: 'Gestión de disponibilidad' },
  { id: 'catalogos', label: 'Catálogos' },
]

function hoyISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

function msgError(e: unknown): string {
  if (e instanceof ApiError) return `${e.codigo}: ${e.message}`
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return JSON.stringify(e)
}

function estadoBadge(estadoId: number) {
  const clases: Record<number, string> = {
    1: 'bg-sky-50 text-sky-800 border-sky-300', // Programada
    2: 'bg-emerald-50 text-emerald-800 border-emerald-300', // Confirmada
    3: 'bg-amber-50 text-amber-800 border-amber-300', // EnAtencion
    4: 'bg-teal-50 text-teal-800 border-teal-300', // Realizada
    5: 'bg-rose-50 text-rose-800 border-rose-300', // Cancelada
    6: 'bg-slate-100 text-slate-600 border-slate-300', // No asistio
    7: 'bg-violet-50 text-violet-800 border-violet-300', // Reprogramada
  }
  return clases[estadoId] ?? 'bg-slate-100 text-slate-700 border-slate-300'
}

function Spinner({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-5 py-4 text-sm text-foreground/70" role="status">
      <svg
        className="h-5 w-5 animate-spin text-primary"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <span>{texto}</span>
    </div>
  )
}

function Aviso({ msg }: { msg: string }) {
  return (
    <p className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      {msg}
    </p>
  )
}

function Exito({ msg }: { msg: string }) {
  return (
    <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      {msg}
    </p>
  )
}

/** Modal de confirmación tras crear una cita: exige OK/Enter y vuelve a la agenda. */
function ModalExitoCreacion({ cita, onOk }: { cita: CitaDto; onOk: () => void }) {
  const botonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    botonRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        onOk()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onOk])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onOk}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cita creada"
        className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Cita creada</p>
        <div className="mt-4 space-y-2 text-sm">
          <FilaDetalle k="Cita" v={`#${cita.id}`} />
          <FilaDetalle k="Paciente" v={cita.paciente.nombresCompletos} />
          <FilaDetalle k="Fecha y hora" v={formatFechaHora(cita.fechaHora)} />
          <FilaDetalle k="Profesional" v={cita.profesional.nombresCompletos} />
          <FilaDetalle k="Tipo" v={cita.tipoCita.nombre} />
        </div>
        <button
          ref={botonRef}
          type="button"
          onClick={onOk}
          className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          OK · Volver a la agenda
        </button>
        <p className="mt-2 text-center text-[11px] text-foreground/50">Presione Enter o haga clic en OK</p>
      </div>
    </div>
  )
}

/** Modal de error/advertencia: texto seleccionable para copiar a soporte. */
function ModalError({ msg, onCerrar }: { msg: string; onCerrar: () => void }) {
  const botonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    botonRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        onCerrar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCerrar])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCerrar}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Error o advertencia"
        className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-700">
          Error o advertencia
        </p>
        <p className="mt-3 max-h-60 select-text overflow-y-auto whitespace-pre-wrap rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {msg}
        </p>
        <button
          ref={botonRef}
          type="button"
          onClick={onCerrar}
          className="mt-5 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Entendido
        </button>
        <p className="mt-2 text-center text-[11px] text-foreground/50">
          Seleccione el texto para copiarlo · Enter o clic para cerrar
        </p>
      </div>
    </div>
  )
}

/** Modal de cancelación de cita: motivo + confirmación, cierra con ESC/Cancelar. */
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
      setError('La cancelación requiere un motivo.')
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
          aria-label="Cita cancelada"
          className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Cita cancelada</p>
          <p className="mt-3 text-sm text-foreground/70">La cita fue cancelada exitosamente.</p>
          <button
            type="button"
            onClick={onExito}
            className="mt-5 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            OK
          </button>
          <p className="mt-2 text-center text-[11px] text-foreground/50">Enter o clic para cerrar</p>
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
        aria-label="Cancelar cita"
        className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-700">Cancelar cita</p>
        <p className="mt-1 text-xs text-foreground/50">Cita #{citaId}</p>

        {error && (
          <div className="mt-3">
            <Aviso msg={error} />
          </div>
        )}

        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            Motivo de cancelación *
            <select
              value={motivoSeleccion}
              onChange={(e) => { setMotivoSeleccion(e.target.value); setMotivoOtro('') }}
              className={inputCls}
              disabled={enviando}
            >
              <option value="">Seleccionar motivo…</option>
              {motivos.map((m) => (
                <option key={m.id} value={m.nombre}>{m.nombre}</option>
              ))}
            </select>
          </label>
          {motivoSeleccion === 'Otro' && (
            <label className="block text-sm font-medium">
              Especifique el motivo *
              <textarea
                value={motivoOtro}
                onChange={(e) => setMotivoOtro(e.target.value)}
                className={inputCls}
                rows={2}
                placeholder="Describa el motivo de la cancelación"
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
            {enviando ? 'Cancelando…' : 'Confirmar cancelación'}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            disabled={enviando}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-muted disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-foreground/50">ESC para cerrar</p>
      </div>
    </div>,
    document.body,
  )
}

const inputCls =
  'mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'

function Cabecera({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold text-foreground">{titulo}</h1>
      <p className="mt-1 text-sm text-foreground/60">{sub}</p>
    </header>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-lg border border-border bg-white p-5">
      <h2 className="mb-4 text-base font-semibold">{titulo}</h2>
      {children}
    </section>
  )
}

function formatFechaHora(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** La API guarda horas en hora local (sin zona). Evita convertir a UTC (toISOString). */
function conSegundos(fh: string): string {
  return fh.length === 16 ? `${fh}:00` : fh
}

function formatFecha(iso: string): string {
  const parts = iso.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Reúne catálogos usados por varias vistas. */
function useCatalogos() {
  const [especialidades, setEspecialidades] = useState<EspecialidadDto[]>([])
  const [sedes, setSedes] = useState<SedeDto[]>([])
  const [profesionales, setProfesionales] = useState<ProfesionalResumenDto[]>([])
  const [tiposCita, setTiposCita] = useState<TipoCitaDto[]>([])
  const [tiposId, setTiposId] = useState<TipoIdentificacionDto[]>([])
  const [aseguradoras, setAseguradoras] = useState<AseguradoraDto[]>([])
  const [tiposUsuario, setTiposUsuario] = useState<TipoUsuarioDto[]>([])
  const [motivosCancelacion, setMotivosCancelacion] = useState<MotivoCancelacionDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    Promise.all([
      api.especialidades(),
      api.sedes(),
      api.profesionales(),
      api.tiposCita(),
      api.tiposIdentificacion(),
      api.aseguradoras({ nombre: '' }),
      api.tiposUsuario(),
      api.motivosCancelacion(),
    ])
      .then(([es, se, pr, tc, ti, asko, tus, moc]) => {
        setEspecialidades(es)
        setSedes(se)
        setProfesionales(pr)
        setTiposCita(tc)
        setTiposId(ti)
        setAseguradoras(asko)
        setTiposUsuario(tus)
        setMotivosCancelacion(moc)
      })
      .catch((e) => setError(msgError(e)))
      .finally(() => setCargando(false))
  }, [])

  return {
    especialidades,
    sedes,
    profesionales,
    tiposCita,
    tiposId,
    aseguradoras,
    tiposUsuario,
    motivosCancelacion,
    error,
    cargando,
  }
}

export default function App() {
  const catalogo = useCatalogos()
  const [vista, setVista] = useState<Vista>('agenda')
  const [configAbierta, setConfigAbierta] = useState(false)
  const [citaHint, setCitaHint] = useState<CitaHint | null>(null)
  const [agendaEnfoque, setAgendaEnfoque] = useState<{
    fecha: string
    profesionalesIds: number[]
  } | null>(null)

  // Liberar el bloqueo preventivo solo en eventos explícitos (navegación),
  // NO en cleanup de useEffect: bajo React StrictMode (dev) el efecto se
  // desmonta y remonta sintéticamente al cargar, lo que liberaba el token
  // de inmediato y provocaba "El turno seleccionado ya no está reservado".
  function navegar(v: Vista) {
    if (v !== 'nueva-cita' && citaHint?.bloqueoId) {
      void api.liberarBloqueo(citaHint.bloqueoId).catch(() => {})
    }
    setVista(v)
  }

  // Abandonar la creación sin guardar: libera la reserva y vuelve a la agenda
  // del día/profesional desde el que se abrió el formulario.
  function abandonarNuevaCita() {
    const h = citaHint
    if (h?.fechaHora) {
      setAgendaEnfoque({
        fecha: h.fechaHora.slice(0, 10),
        profesionalesIds: h.profesionalId ? [h.profesionalId] : [],
      })
    }
    setCitaHint(null)
    navegar('agenda')
  }

  // Al confirmar la cita creada (modal OK): volver a la agenda del día y
  // profesional de la cita, y limpiar el hint/reserva.
  function finalizarNuevaCita(cita: CitaDto) {
    setCitaHint(null)
    setAgendaEnfoque({
      fecha: cita.fechaHora.slice(0, 10),
      profesionalesIds: [cita.profesional.id],
    })
    setVista('agenda')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside
          className="w-60 shrink-0 border-r border-border bg-white"
          aria-label="Navegación principal"
        >
          <div className="flex items-center gap-3 border-b border-border px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Agenda Médica</p>
              <p className="text-xs text-foreground/60">Gestión de citas</p>
            </div>
          </div>

          <nav className="space-y-1 px-3 py-4">
            {NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => navegar(n.id)}
                aria-current={vista === n.id ? 'page' : undefined}
                className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  vista === n.id ? 'bg-primary text-white' : 'text-foreground/80 hover:bg-muted'
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>

          <div className="border-t border-border px-3 py-3">
            <button
              type="button"
              onClick={() => setConfigAbierta(true)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
            >
              ⚙ Configuración de búsquedas
            </button>
            <p className="mt-2 px-3 text-xs text-foreground/50">API · http://localhost:5047</p>
          </div>
        </aside>

        <main className="flex-1 px-6 py-6 sm:px-8">
          {vista === 'agenda' && (
            <AgendaView
              fechaInicial={agendaEnfoque?.fecha}
              profesionalesIniciales={agendaEnfoque?.profesionalesIds}
              onCrearCita={async (hint) => {
                if (citaHint?.bloqueoId) {
                  void api.liberarBloqueo(citaHint.bloqueoId).catch(() => {})
                }
                let bloqueoId: string | null = null
                try {
                  const d = new Date(hint.fechaHora)
                  const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
                    d.getDate(),
                  ).padStart(2, '0')}`
                  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                  if (hint.profesionalId) {
                    const r = await api.reservarBloqueo({
                      profesionalId: hint.profesionalId,
                      fecha,
                      horaInicio: hora,
                    })
                    if (r.exitoso) bloqueoId = r.bloqueoId ?? null
                  }
                } catch {
                  // si la reserva falla, agendar igual (la API valida de nuevo)
                }
                setCitaHint({ ...hint, bloqueoId })
                navegar('nueva-cita')
              }}
            />
          )}
          {vista === 'nueva-cita' && (
            <NuevaCitaView
              hint={citaHint}
              onFinalizar={finalizarNuevaCita}
              onAbandonar={abandonarNuevaCita}
            />
          )}
          {vista === 'pacientes' && <PacientesView />}
          {vista === 'profesionales' && <ProfesionalesView />}
          {vista === 'disponibilidad' && (
            <DisponibilidadView
              profesionales={catalogo.profesionales}
              profesionalInicial={catalogo.profesionales[0] ?? null}
              onVolver={() => {}}
              showVolver={false}
            />
          )}
          {vista === 'catalogos' && <CatalogosView />}
        </main>
      </div>

      <VentanaConfigBusqueda abierta={configAbierta} onCerrar={() => setConfigAbierta(false)} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  AGENDA — Calendario multi-vista (Fase 2)
// ══════════════════════════════════════════════════════════════
type VistaAgenda = 'diario' | 'semanal' | 'mensual' | 'lista'

type FilaAgenda = { profesional: ProfesionalResumenDto; items: AgendaDiaItemDto[] }

/** "08:30" → 510 (minutos del día). */
function aMinutos(hm: string): number {
  const [h, m] = String(hm).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

const diaANombre = (d: Date) =>
  d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')

function sumarDias(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dd}`
}

function lunesDeLaSemana(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay()
  return sumarDias(iso, diff)
}

function primerUltimoDiaMes(iso: string): { primero: string; ultimo: string } {
  const d = new Date(`${iso}T00:00:00`)
  const primero = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const uLtimo = `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, '0')}-${String(
    ultimo.getDate(),
  ).padStart(2, '0')}`
  return { primero, ultimo: uLtimo }
}

const ESTADOS_CITA: { id: number; nombre: string }[] = [
  { id: 1, nombre: 'Programada' },
  { id: 2, nombre: 'Confirmada' },
  { id: 3, nombre: 'En atención' },
  { id: 4, nombre: 'Realizada' },
  { id: 5, nombre: 'Cancelada' },
  { id: 6, nombre: 'No asistió' },
  { id: 7, nombre: 'Reprogramada' },
]

function AgendaView({
  onCrearCita,
  fechaInicial,
  profesionalesIniciales,
}: {
  onCrearCita?: (hint: CitaHint) => void
  fechaInicial?: string
  profesionalesIniciales?: number[]
}) {
  const catalogo = useCatalogos()
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
            tipoCitaId: catalogo.tiposCita[0]?.id ?? 1,
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

  // Drag & drop (Fase 3 — item 11): reprogramar arrastrando la cita a un slot libre.
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
    .map((pid) => catalogo.profesionales.find((p) => p.id === pid))
    .filter((p): p is ProfesionalResumenDto => Boolean(p))
    .map((profesional) => ({
      profesional,
      items: items
        .filter((i) => i.profesionalId === profesional.id)
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    }))

  async function buscarProximoTurno() {
    if (profIds.length === 0 || catalogo.tiposCita.length === 0) return
    const tipoCitaId = catalogo.tiposCita[0].id
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
      setError('No hay turnos disponibles en los próximos 30 días para los profesionales seleccionados.')
    } catch (e) {
      setError(msgError(e))
    } finally {
      setBuscandoTurno(false)
    }
  }

  return (
    <div>
      <Cabecera
        titulo="Agenda"
        sub="Calendario de citas por profesional. Seleccione los médicos a mostrar."
      />

      {/* ── Barra superior: pestañas + controles ── */}
      <div className="mb-4 rounded-xl border border-border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg border border-border p-0.5" role="tablist">
            {(
              [
                ['diario', 'Diario'],
                ['semanal', 'Semanal'],
                ['mensual', 'Mensual'],
                ['lista', 'Lista'],
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

          <div className="flex flex-wrap items-center gap-3">
            {vista === 'diario' && (
              <>
                <button type="button" onClick={() => setFecha(sumarDias(fecha, -1))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">‹</button>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
                <button type="button" onClick={() => setFecha(sumarDias(fecha, 1))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">›</button>
                <button type="button" onClick={() => setFecha(hoyISO())} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">Hoy</button>
              </>
            )}
            {vista === 'semanal' && (
              <>
                <button type="button" onClick={() => setFecha(sumarDias(fecha, -7))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">‹ Semana</button>
                <span className="text-sm font-medium">{formatFecha(desde)} – {formatFecha(hasta)}</span>
                <button type="button" onClick={() => setFecha(sumarDias(fecha, 7))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">Semana ›</button>
                <button type="button" onClick={() => setFecha(hoyISO())} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">Hoy</button>
              </>
            )}
            {vista === 'mensual' && (
              <>
                <button type="button" onClick={() => setFecha(sumarDias(fecha, -30))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">‹</button>
                <input type="month" value={fecha.slice(0, 7)} onChange={(e) => setFecha(e.target.value ? `${e.target.value}-01` : fecha)} className={inputCls} />
                <button type="button" onClick={() => setFecha(sumarDias(fecha, 31))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">›</button>
                <button type="button" onClick={() => setFecha(hoyISO())} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">Hoy</button>
              </>
            )}
            {vista === 'lista' && (
              <>
                <label className="text-sm">Desde
                  <input type="date" value={desdeLista} onChange={(e) => setDesdeLista(e.target.value)} className={inputCls} />
                </label>
                <label className="text-sm">Hasta
                  <input type="date" value={hastaLista} onChange={(e) => setHastaLista(e.target.value)} className={inputCls} />
                </label>
              </>
            )}
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                onClick={buscarProximoTurno}
                disabled={buscandoTurno || profIds.length === 0}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {buscandoTurno ? 'Buscando…' : 'Próximo turno disponible'}
              </button>
              <span className="text-[11px] text-foreground/50">
                Buscar a partir del {formatFecha(fecha)}
                {fecha === hoyISO()
                  ? ` desde las ${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
                  : ' desde la mañana'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRefresh((x) => x + 1)}
              disabled={cargando}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-50"
              title="Actualizar datos de la agenda"
            >
              ↻ Actualizar
            </button>
          </div>
        </div>

        {/* Profesionales (multi-recurso a demanda) */}
        <div className="mt-3">
          <p className="mb-2 text-sm font-medium">Profesionales</p>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {catalogo.profesionales.map((p) => (
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
          <span className="text-xs font-medium text-foreground/60">Estados:</span>
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
              {e.nombre}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEstadosActivos(ESTADOS_CITA.map((x) => x.id))}
            className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground/60 hover:bg-muted"
          >
            Todos
          </button>
        </div>
      </div>

      {error && <Aviso msg={error} />}
      {turnoEncontrado && (
        <div className="mb-4">
          <Exito msg={`Próximo turno: ${turnoEncontrado}`} />
        </div>
      )}
      {cargando && <Spinner />}

      {!cargando && profIds.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-foreground/60">
          Seleccione al menos un profesional para ver el calendario.
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

const HORA_INICIO = 6 * 60 // 06:00
const HORA_FIN = 21 * 60 // 21:00
const PX_POR_HORA = 72 // px por hora en la escala (más ancho = slots más clicables)
const ANCHO_COL = 180 // columna izquierda (profesional)
const ANCHO_ESCALA = ((HORA_FIN - HORA_INICIO) / 60) * PX_POR_HORA
const pxHora = (min: number) => ((min - HORA_INICIO) / 60) * PX_POR_HORA
const horasEje = Array.from(
  { length: (HORA_FIN - HORA_INICIO) / 60 + 1 },
  (_, i) => HORA_INICIO + i * 60,
)

const colorEstado: Record<number, string> = {
  1: '#0369a1',
  2: '#047857',
  3: '#b45309',
  4: '#0f766e',
  5: '#be123c',
  6: '#475569',
  7: '#6d28d9',
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
  const todas = filas.flatMap((f) => f.items)

  // Estados desde los que se permite arrastrar (transición válida a Reprogramada).
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
              No hay citas para esta fecha y los profesionales seleccionados.
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
                          color: colorEstado[i.estadoId] ?? '#475569',
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
            Ver detalle
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs text-rose-700 hover:bg-rose-50"
            onClick={() => {
              setAbierto(false)
              onDetalle()
            }}
          >
            Acciones de estado…
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
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(desde, i))
  // Solo estados con transición válida a Reprogramada (ver _transiciones del dominio).
  const REPROGRAMABLES = new Set([1, 2])
  const [arrastre, setArrastre] = useState<{ citaId: number; hora: string } | null>(null)
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
              <th className="px-3 py-3">Profesional</th>
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
                            color: colorEstado[i.estadoId] ?? '#475569',
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
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="py-2">{d}</div>
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
                      backgroundColor: `color-mix(in srgb, ${colorEstado[i.estadoId] ?? '#475569'} 14%, white)`,
                      color: colorEstado[i.estadoId] ?? '#475569',
                    }}
                  >
                    {i.horaInicio} {i.paciente}
                  </button>
                ))}
                {delDia.length > 3 && (
                  <span className="block text-[10px] text-foreground/50">+{delDia.length - 3} más</span>
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
  if (items.length === 0)
    return (
      <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-foreground/60">
        No hay citas en el rango seleccionado.
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
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Profesional</th>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Estado</th>
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

/** Hint para NuevaCitaView cuando se agenda desde un slot libre. */
type CitaHint = {
  fechaHora: string
  profesionalId?: number
  tipoCitaId?: number
  consultorioSala?: string | null
  motivo?: string
  bloqueoId?: string | null
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
        Seleccione una cita para ver su detalle, historial y acciones.
      </div>
    )
  }

  async function ejecutarAccion(): Promise<void> {
    if (!detalle) return
    setEnviando(true)
    setError(null)
    try {
      if (accion === 'cancelar') {
        const motivoFinal = motivoCancelacion === 'Otro' ? motivoOtro.trim() : motivoCancelacion
        if (!motivoFinal) {
          setError('La cancelación requiere un motivo.')
          setEnviando(false)
          return
        }
        await api.cancelarCita(detalle.id, { motivo: motivoFinal })
      } else if (accion === 'reprogramar') {
        if (!nuevaFecha) {
          setError('Seleccione la nueva fecha y hora.')
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
  if ([1, 7].includes(cita.estadoId)) acciones.push({ id: 'confirmar', label: 'Confirmar' })
  if ([1, 2, 7].includes(cita.estadoId)) acciones.push({ id: 'iniciar', label: 'Iniciar atención' })
  if ([2].includes(cita.estadoId)) acciones.push({ id: 'noasistio', label: 'No asistió' })
  if ([3].includes(cita.estadoId)) acciones.push({ id: 'realizar', label: 'Marcar realizada' })

  return (
    <div className="sticky top-4">
      {/* Acciones del ciclo de vida — fuera del cuadro de detalle */}
      <div className="mb-3 rounded-lg border border-border bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">Acciones</p>
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
              Reprogramar
            </button>
          )}
          {[1, 2, 3, 7].includes(cita.estadoId) && (
            <button
              type="button"
              onClick={() => setAccion('cancelar')}
              className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Cancelar Cita
            </button>
          )}
        </div>

        {accion && accion !== 'cancelar' && (
          <form
            className="mt-3 rounded-md border border-border bg-muted/40 p-3"
            onSubmit={(e) => {
              e.preventDefault()
              void ejecutarAccion()
            }}
          >
            {accion === 'reprogramar' && (
              <label className="block text-sm font-medium">
                Nueva fecha y hora
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
                Motivo (opcional)
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className={inputCls}
                  placeholder="Motivo de la reprogramación"
                />
              </label>
            )}
            {accion === 'noasistio' && (
              <p className="text-xs text-foreground/60">
                Se marcará la cita como no asistió.
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                disabled={enviando}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {enviando ? 'Guardando…' : 'Confirmar acción'}
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
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Cuadro de detalle de la cita */}
      <div className="rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Cita #{cita.citaId}</h2>
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
          <Spinner texto="Cargando detalle…" />
        ) : (
          <>
            <dl className="space-y-2 text-sm">
              <FilaDetalle k="Fecha" v={`${formatFecha(cita.fecha)} · ${cita.horaInicio}–${cita.horaFin}`} />
              <FilaDetalle k="Paciente" v={`${cita.paciente} (${cita.identificacion})`} />
              <FilaDetalle k="Edad" v={`${cita.edadPaciente} años · ${cita.sexo === 'M' ? 'M' : 'F'}`} />
              <FilaDetalle k="Profesional" v={`${cita.profesionalNombre}${cita.especialidad ? ` · ${cita.especialidad}` : ''}`} />
              <FilaDetalle k="Tipo de cita" v={`${cita.tipoCita} · ${cita.duracionMinutos} min`} />
              <FilaDetalle k="Aseguradora" v={cita.aseguradora ?? '—'} />
              <FilaDetalle k="Régimen" v={cita.regimen ?? '—'} />
              <FilaDetalle k="Motivo" v={cita.motivoConsulta ?? '—'} />
              <FilaDetalle k="Observaciones" v={detalle.observaciones ?? '—'} />
              {detalle.teamsJoinUrl && (
                <div className="pt-1">
                  <a
                    href={detalle.teamsJoinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Unirse a Teams →
                  </a>
                </div>
              )}
            </dl>

            {/* Historial */}
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">Historial ({historial.length})</p>
              {historial.length === 0 ? (
                <p className="text-sm text-foreground/50">Sin cambios registrados.</p>
              ) : (
                <ul className="relative space-y-3 pl-4">
                  {historial.map((h) => (
                    <li key={h.id} className="relative border-l border-border pl-3">
                      <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs">
                        <span className="font-semibold">{h.estadoNuevo}</span>
                        {h.estadoAnterior && <span className="text-foreground/50"> (desde {h.estadoAnterior})</span>}
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

function FilaDetalle({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-foreground/50">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  NUEVA CITA
// ══════════════════════════════════════════════════════════════
function NuevaCitaView({
  hint,
  onFinalizar,
  onAbandonar,
}: {
  hint: CitaHint | null
  onFinalizar?: (cita: CitaDto) => void
  onAbandonar?: () => void
}) {
  const catalogo = useCatalogos()
  const configBusqueda = useConfigBusqueda()
  const [docBusqueda, setDocBusqueda] = useState('')
  const [pacientes, setPacientes] = useState<PacienteListaDto | null>(null)
  const [pacienteId, setPacienteId] = useState<number | null>(null)
  const [pacienteNombre, setPacienteNombre] = useState('')
  const [profId, setProfId] = useState<number | null>(hint?.profesionalId ?? null)
  const [tipoCitaId, setTipoCitaId] = useState<number | null>(hint?.tipoCitaId ?? null)
  const [fechaHora, setFechaHora] = useState(
    hint?.fechaHora ? hint.fechaHora.slice(0, 16) : '',
  )
  const [motivo, setMotivo] = useState(hint?.motivo ?? '')
  const [observaciones, setObservaciones] = useState('')
  const [aseguradoraId, setAseguradoraId] = useState<number | null>(null)
  const [tipoUsuarioId, setTipoUsuarioId] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<CitaDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [camposModificados, setCamposModificados] = useState(false)

  useEffect(() => {
    if (docBusqueda.trim().length < configBusqueda.minimoCampo('citas', 'nombre')) {
      setPacientes(null)
      return
    }
    const t = setTimeout(() => {
      api
        .pacientes({ nombre: docBusqueda.trim(), tamPagina: 8 })
        .then(setPacientes)
        .catch((e) => setError(msgError(e)))
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docBusqueda])

  async function enviar() {
    setError(null)
    setResultado(null)
    if (pacienteId === null || profId === null || tipoCitaId === null || !fechaHora) {
      setError('Complete paciente, profesional, tipo de cita y fecha-hora.')
      return
    }
    setEnviando(true)
    try {
      const crearcitaPayload = {
        fechaHora: conSegundos(fechaHora),
        pacienteId,
        profesionalId: profId,
        tipoCitaId,
        aseguradoraId: aseguradoraId ?? undefined,
        tipoUsuarioId: tipoUsuarioId ?? undefined,
        motivoConsulta: motivo || null,
        observaciones: observaciones || null,
        bloqueoId: camposModificados ? null : (hint?.bloqueoId ?? null),
      }
      const creada = await api.crearCita(crearcitaPayload)
      setResultado(creada)
    } catch (e) {
      setError(msgError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <Cabecera
        titulo="Nueva cita"
        sub="Registre una cita para un paciente existente. La duración depende del tipo de cita."
      />

      {resultado && <ModalExitoCreacion cita={resultado} onOk={() => onFinalizar?.(resultado)} />}

      <Seccion titulo="Paciente">
        <label className="block text-sm font-medium" htmlFor="buscar-paciente">
          Buscar por nombre o documento
          <input
            id="buscar-paciente"
            type="search"
            autoFocus
            value={docBusqueda}
            onChange={(e) => setDocBusqueda(e.target.value)}
            placeholder={
              configBusqueda.minimoCampo('citas', 'nombre') > 0
                ? `Escriba al menos ${configBusqueda.minimoCampo('citas', 'nombre')} caracteres…`
                : 'Escriba para buscar…'
            }
            className={inputCls}
          />
        </label>
        {pacientes && pacientes.items.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {pacientes.items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPacienteId(p.id)
                  setPacienteNombre(p.nombresCompletos)
                }}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  pacienteId === p.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-white hover:border-primary/50'
                }`}
              >
                <span className="block font-medium">{p.nombresCompletos}</span>
                <span className="block text-xs text-foreground/60">
                  {p.tipoIdentificacion} {p.numeroIdentificacion} · {p.edadAnios} años
                </span>
              </button>
            ))}
          </div>
        )}
        {pacienteNombre && (
          <p className="mt-3 text-sm text-foreground/60">
            Seleccionado: <span className="font-semibold">{pacienteNombre}</span>
          </p>
        )}
      </Seccion>

      <Seccion titulo="Cita">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Profesional
            <select
              value={profId ?? ''}
              onChange={(e) => {
                const nuevoProfId = e.target.value ? Number(e.target.value) : null
                if (nuevoProfId !== profId) setCamposModificados(true)
                setProfId(nuevoProfId)
              }}
              className={inputCls}
            >
              <option value="">Seleccione…</option>
              {catalogo.profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombresCompletos} — {p.especialidad}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Tipo de cita
            <select
              value={tipoCitaId ?? ''}
              onChange={(e) => setTipoCitaId(e.target.value ? Number(e.target.value) : null)}
              className={inputCls}
            >
              <option value="">Seleccione…</option>
              {catalogo.tiposCita.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} · {t.duracionMinutos} min
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Fecha y hora
            <input
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => {
                if (e.target.value !== fechaHora) setCamposModificados(true)
                setFechaHora(e.target.value)
              }}
              className={inputCls}
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="cita-regimen">
            Régimen
            <select
              id="cita-regimen"
              value={tipoUsuarioId ?? ''}
              onChange={(e) =>
                setTipoUsuarioId(e.target.value ? Number(e.target.value) : null)
              }
              className={inputCls}
            >
              <option value="">Del paciente</option>
              {catalogo.tiposUsuario.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium sm:col-span-2" htmlFor="cita-aseguradora">
            Aseguradora
            <BuscadorAseguradora
              id={aseguradoraId ? String(aseguradoraId) : ''}
              nombre=""
              pantalla="citas"
              onCambio={(ide) => setAseguradoraId(ide ? Number(ide) : null)}
              placeholder="Del paciente — o escriba aseguradora…"
            />
          </label>
        </div>

        <label className="mt-4 block text-sm font-medium" htmlFor="cita-motivo">
          Motivo de consulta
          <textarea
            id="cita-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            className={inputCls}
          />
        </label>
        <label className="mt-4 block text-sm font-medium" htmlFor="cita-observaciones">
          Observaciones
          <textarea
            id="cita-observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            className={inputCls}
          />
        </label>
      </Seccion>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={enviar}
          disabled={enviando}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? 'Registrando…' : 'Registrar cita'}
        </button>
        <button
          type="button"
          onClick={() => onAbandonar?.()}
          disabled={enviando}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar y volver
        </button>
      </div>

      {error && <ModalError msg={error} onCerrar={() => setError(null)} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  PACIENTES
// ══════════════════════════════════════════════════════════════
type ModoFormPaciente = 'crear' | 'editar' | null

function PacientesView() {
  const catalogo = useCatalogos()
  const configBusqueda = useConfigBusqueda()
  const [datos, setDatos] = useState<PacienteListaDto | null>(null)
  const [nombre, setNombre] = useState('')
  const [tipoIdFiltro, setTipoIdFiltro] = useState('')
  const [numDoc, setNumDoc] = useState('')
  const [aseguradoraFiltro, setAseguradoraFiltro] = useState('')
  const [aseguradoraFiltroNombre, setAseguradoraFiltroNombre] = useState('')
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modo, setModo] = useState<ModoFormPaciente>(null)
  const [editarPaciente, setEditarPaciente] = useState<PacienteDto | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState<string | null>(null)

  const recargar = (pag?: number) => {
    setCargando(true)
    setError(null)
    api
      .pacientes({
        nombre: nombre || undefined,
        tipoIdentificacionId: tipoIdFiltro ? Number(tipoIdFiltro) : undefined,
        numeroIdentificacion: numDoc || undefined,
        aseguradoraId: aseguradoraFiltro ? Number(aseguradoraFiltro) : undefined,
        pagina: pag ?? pagina,
        tamPagina: 20,
      })
      .then((d) => {
        setDatos(d)
        setPagina(d.pagina)
      })
      .catch((e) => setError(msgError(e)))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    recargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina])

  function aplicarFiltro() {
    const minNombre = configBusqueda.minimoCampo('pacientes', 'nombre')
    const minDoc = configBusqueda.minimoCampo('pacientes', 'documento')
    if (nombre.trim() && nombre.trim().length < minNombre && minNombre > 0) {
      setError(`El nombre requiere al menos ${minNombre} caracteres para buscar.`)
      return
    }
    if (numDoc.trim() && numDoc.trim().length < minDoc && minDoc > 0) {
      setError(`El número de documento requiere al menos ${minDoc} caracteres para buscar.`)
      return
    }
    setError(null)
    recargar(1)
  }

  async function inactivar(p: PacienteDto) {
    if (
      !confirm(
        `¿Desea inactivar al paciente ${p.nombresCompletos}? No aparecerá en los resultados activos.`,
      )
    ) {
      return
    }
    try {
      await api.inactivarPaciente(p.id)
      setExito(`Paciente ${p.nombresCompletos} inactivado.`)
      recargar()
    } catch (e) {
      setError(msgError(e))
    }
  }

  return (
    <div>
      <Cabecera
        titulo="Pacientes"
        sub="Registre, consulte y administre los pacientes de la institución."
      />

      {error && (
        <div className="mb-4">
          <Aviso msg={error} />
        </div>
      )}
      {exito && (
        <div className="mb-4">
          <Exito msg={exito} />
        </div>
      )}

      <div className="mb-5 rounded-xl border border-border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm font-medium" htmlFor="f-nombre">
            Nombre
            <input
              id="f-nombre"
              type="search"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Buscar por nombre…"
              className={inputCls}
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="f-documento">
            Número de documento
            <input
              id="f-documento"
              type="search"
              value={numDoc}
              onChange={(e) => setNumDoc(e.target.value)}
              placeholder="Documento…"
              className={inputCls}
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="f-tipo-doc">
            Tipo de identificación
            <select
              id="f-tipo-doc"
              value={tipoIdFiltro}
              onChange={(e) => setTipoIdFiltro(e.target.value)}
              className={inputCls}
            >
              <option value="">Todos</option>
              {catalogo.tiposId.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          <label
            className="block text-sm font-medium lg:col-span-3"
            htmlFor="f-aseguradora"
          >
            Aseguradora
            <BuscadorAseguradora
              id={aseguradoraFiltro}
              nombre={aseguradoraFiltroNombre}
              pantalla="pacientes"
              onCambio={(ide, nom) => {
                setAseguradoraFiltro(ide)
                setAseguradoraFiltroNombre(nom ?? '')
              }}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={aplicarFiltro}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => setModo('crear')}
            className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Nuevo paciente
          </button>
        </div>
      </div>

      {(modo === 'crear' || modo === 'editar') && (
        <FormPaciente
          catalogo={catalogo}
          paciente={modo === 'editar' ? editarPaciente : null}
          guardando={guardando}
          onCancelar={() => {
            setModo(null)
            setEditarPaciente(null)
          }}
          onGuardar={async (payload) => {
            setGuardando(true)
            setError(null)
            try {
              if (modo === 'crear') {
                await api.crearPaciente(payload)
                setExito('Paciente creado correctamente.')
              } else if (editarPaciente) {
                await api.actualizarPaciente(editarPaciente.id, payload)
                setExito('Paciente actualizado correctamente.')
              }
              setModo(null)
              setEditarPaciente(null)
              recargar()
            } catch (e) {
              setError(msgError(e))
            } finally {
              setGuardando(false)
            }
          }}
        />
      )}

      {cargando && <Spinner />}

      {!cargando && datos && datos.items.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-foreground/60">
          No se encontraron pacientes con los criterios indicados.
        </div>
      )}

      {!cargando && datos && datos.items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
                  <th className="px-4 py-3">Identificación</th>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Nombres completos</th>
                  <th className="px-4 py-3">Sexo</th>
                  <th className="px-4 py-3">Fecha nacimiento</th>
                  <th className="px-4 py-3">Aseguradora</th>
                  <th className="px-4 py-3">Régimen</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((p) => (
                  <tr key={p.id} className="border-t border-border first:border-t-0 hover:bg-muted/40">
                    <td className="px-4 py-3">{p.tipoIdentificacion}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.numeroIdentificacion}</td>
                    <td className="px-4 py-3 font-medium">{p.nombresCompletos}</td>
                    <td className="px-4 py-3">{p.sexo}</td>
                    <td className="px-4 py-3">{formatFecha(p.fechaNacimiento)}</td>
                    <td className="px-4 py-3">{p.aseguradora ?? '—'}</td>
                    <td className="px-4 py-3">{p.regimen ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.celular || p.email ? (
                        <div className="text-xs text-foreground/60">
                          {p.celular && <div>{p.celular}</div>}
                          {p.email && <div>{p.email}</div>}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          p.activo
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        disabled={modo !== null}
                        onClick={() => {
                          setEditarPaciente(p)
                          setModo('editar')
                        }}
                        className="mr-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted disabled:opacity-40"
                      >
                        Editar
                      </button>
                      {p.activo && (
                        <button
                          type="button"
                          onClick={() => inactivar(p)}
                          className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                        >
                          Inactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {datos.totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-foreground/60">
              <span>
                Página {datos.pagina} de {datos.totalPaginas} · {datos.total} pacientes
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={datos.pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={datos.pagina >= datos.totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FormPaciente({
  catalogo,
  paciente,
  guardando,
  onCancelar,
  onGuardar,
}: {
  catalogo: ReturnType<typeof useCatalogos>
  paciente: PacienteDto | null
  guardando: boolean
  onCancelar: () => void
  onGuardar: (payload: {
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
  }) => Promise<void>
}) {
  const esEdicion = paciente !== null
  const [tipoDoc, setTipoDoc] = useState(
    String(
      catalogo.tiposId.find((t) => t.codigo === paciente?.tipoIdentificacion)?.id ??
        catalogo.tiposId[0]?.id ??
        1,
    ),
  )
  const [numDoc, setNumDoc] = useState(paciente?.numeroIdentificacion ?? '')
  const [nombres, setNombres] = useState(paciente?.nombresCompletos ?? '')
  const [nacimiento, setNacimiento] = useState(
    paciente?.fechaNacimiento ? paciente.fechaNacimiento.slice(0, 10) : '',
  )
  const [sexo, setSexo] = useState<'M' | 'F'>(paciente?.sexo ?? 'M')
  const [celular, setCelular] = useState(paciente?.celular ?? '')
  const [email, setEmail] = useState(paciente?.email ?? '')
  const [whatsapp, setWhatsapp] = useState(paciente?.whatsapp ?? '')
  const [aseguradoraId, setAseguradoraId] = useState<string>(paciente?.aseguradoraId ? String(paciente.aseguradoraId) : '')
  const [tipoUsuarioId, setTipoUsuarioId] = useState<string>(paciente?.tipoUsuarioId ? String(paciente.tipoUsuarioId) : '')
  const [empresa, setEmpresa] = useState(paciente?.empresa ?? '')
  const [errors, setErrors] = useState<string[]>([])

  function validarYEnviar() {
    const e: string[] = []
    if (!nombres.trim()) e.push('Los nombres completos son obligatorios.')
    if (!numDoc.trim()) e.push('El número de identificación es obligatorio.')
    if (!nacimiento) e.push('La fecha de nacimiento es obligatoria.')
    if (!sexo) e.push('El sexo es obligatorio.')
    setErrors(e)
    if (e.length > 0) return

    onGuardar({
      tipoIdentificacionId: Number(tipoDoc),
      numeroIdentificacion: numDoc.trim(),
      nombresCompletos: nombres.trim(),
      fechaNacimiento: nacimiento,
      sexo,
      celular: celular || null,
      email: email || null,
      whatsapp: whatsapp || null,
      aseguradoraId: aseguradoraId ? Number(aseguradoraId) : null,
      tipoUsuarioId: tipoUsuarioId ? Number(tipoUsuarioId) : null,
      empresa: empresa || null,
    })
  }

  return (
    <Seccion titulo={esEdicion ? 'Editar paciente' : 'Nuevo paciente'}>
      {errors.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor="p-tipo-doc">
          Tipo de identificación
          <select
            id="p-tipo-doc"
            value={tipoDoc}
            onChange={(e) => setTipoDoc(e.target.value)}
            disabled={esEdicion}
            className={inputCls}
          >
            {catalogo.tiposId.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="p-documento">
          Número de identificación
          <input
            id="p-documento"
            type="text"
            value={numDoc}
            onChange={(e) => setNumDoc(e.target.value)}
            disabled={esEdicion}
            className={inputCls}
          />
        </label>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium" htmlFor="p-nombres">
            Nombres completos
            <input
              id="p-nombres"
              type="text"
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
        <label className="block text-sm font-medium" htmlFor="p-nacimiento">
          Fecha de nacimiento
          <input
            id="p-nacimiento"
            type="date"
            value={nacimiento}
            onChange={(e) => setNacimiento(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="p-sexo">
          Sexo
          <select
            id="p-sexo"
            value={sexo}
            onChange={(e) => setSexo(e.target.value as 'M' | 'F')}
            className={inputCls}
          >
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </label>
      </div>

      <h3 className="mb-3 mt-6 border-t border-border pt-4 text-sm font-semibold">Contacto</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium" htmlFor="p-celular">
          Celular
          <input
            id="p-celular"
            type="tel"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="p-email">
          Correo electrónico
          <input
            id="p-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="p-whatsapp">
          WhatsApp
          <input
            id="p-whatsapp"
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      <h3 className="mb-3 mt-6 border-t border-border pt-4 text-sm font-semibold">Cobertura</h3>
      <div className="grid gap-4 sm:grid-cols-1">
        <label className="block text-sm font-medium" htmlFor="p-aseguradora">
            Aseguradora
            <BuscadorAseguradora
              id={aseguradoraId}
              nombre={paciente?.aseguradora ?? ''}
              pantalla="pacientes"
              onCambio={(ide) => setAseguradoraId(ide)}
            />
          </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor="p-regimen">
          Régimen
          <select
            id="p-regimen"
            value={tipoUsuarioId}
            onChange={(e) => setTipoUsuarioId(e.target.value)}
            className={inputCls}
          >
            <option value="">Sin régimen</option>
            {catalogo.tiposUsuario.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="p-empresa">
          Empresa
          <input
            id="p-empresa"
            type="text"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={validarYEnviar}
          disabled={guardando}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar paciente'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
    </Seccion>
  )
}

// ══════════════════════════════════════════════════════════════
//  PROFESIONALES / MÉDICOS
// ══════════════════════════════════════════════════════════════
type ModoFormProfesional = 'crear' | 'editar' | null

function ProfesionalesView() {
  const catalogo = useCatalogos()
  const [items, setItems] = useState<ProfesionalResumenDto[] | null>(null)
  const [termino, setTermino] = useState('')
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('')
  const [filtroSede, setFiltroSede] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const [modo, setModo] = useState<ModoFormProfesional>(null)
  const [editarProfesional, setEditarProfesional] = useState<ProfesionalResumenDto | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [horarioDe, setHorarioDe] = useState<ProfesionalResumenDto | null>(null)

  const recargar = () => {
    setCargando(true)
    setError(null)
    api
      .profesionales()
      .then(setItems)
      .catch((e) => setError(msgError(e)))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    recargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtrados = (items ?? []).filter((p) => {
    if (soloActivos && !p.activo) return false
    if (filtroEspecialidad && p.especialidadId !== Number(filtroEspecialidad)) return false
    if (filtroSede && p.sedeId !== Number(filtroSede)) return false
    if (termino.trim() && !p.nombresCompletos.toLowerCase().includes(termino.trim().toLowerCase()))
      return false
    return true
  })

  async function inactivar(p: ProfesionalResumenDto) {
    if (
      !confirm(`¿Desea inactivar al profesional ${p.nombresCompletos}? No aparecerá en los resultados activos.`)
    ) {
      return
    }
    try {
      await api.inactivarProfesional(p.id)
      setExito(`Profesional ${p.nombresCompletos} inactivado.`)
      recargar()
    } catch (e) {
      setError(msgError(e))
    }
  }

  if (horarioDe) {
    return (
      <DisponibilidadView
        profesionales={items ?? []}
        profesionalInicial={horarioDe}
        onVolver={() => setHorarioDe(null)}
        bloqueado
      />
    )
  }

  return (
    <div>
      <Cabecera
        titulo="Profesionales"
        sub="Responsables de atención: médicos y demás profesionales que atienden citas."
      />

      {error && (
        <div className="mb-4">
          <Aviso msg={error} />
        </div>
      )}
      {exito && (
        <div className="mb-4">
          <Exito msg={exito} />
        </div>
      )}

      <div className="mb-5 rounded-xl border border-border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-medium" htmlFor="pf-termino">
            Nombre
            <input
              id="pf-termino"
              type="search"
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              placeholder="Buscar por nombre…"
              className={inputCls}
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="pf-especialidad">
            Especialidad
            <select
              id="pf-especialidad"
              value={filtroEspecialidad}
              onChange={(e) => setFiltroEspecialidad(e.target.value)}
              className={inputCls}
            >
              <option value="">Todas</option>
              {catalogo.especialidades.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium" htmlFor="pf-sede">
            Sede
            <select
              id="pf-sede"
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
              className={inputCls}
            >
              <option value="">Todas</option>
              {catalogo.sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Solo activos
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModo('crear')}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Nuevo profesional
          </button>
        </div>
      </div>

      {(modo === 'crear' || modo === 'editar') && (
        <FormProfesional
          catalogo={catalogo}
          profesional={modo === 'editar' ? editarProfesional : null}
          guardando={guardando}
          onCancelar={() => {
            setModo(null)
            setEditarProfesional(null)
          }}
          onGuardar={async (payload) => {
            setGuardando(true)
            setError(null)
            try {
              if (modo === 'crear') {
                await api.crearProfesional(payload)
                setExito('Profesional creado correctamente.')
              } else if (editarProfesional) {
                await api.actualizarProfesional(editarProfesional.id, payload)
                setExito('Profesional actualizado correctamente.')
              }
              setModo(null)
              setEditarProfesional(null)
              recargar()
            } catch (e) {
              setError(msgError(e))
            } finally {
              setGuardando(false)
            }
          }}
        />
      )}

      {cargando && <Spinner />}

      {!cargando && items && filtrados.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-foreground/60">
          No se encontraron profesionales con los criterios indicados.
        </div>
      )}

      {!cargando && items && filtrados.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
                  <th className="px-4 py-3">Identificación</th>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Nombres completos</th>
                  <th className="px-4 py-3">Especialidad</th>
                  <th className="px-4 py-3">Sede</th>
                  <th className="px-4 py-3">Consultorio</th>
                  <th className="px-4 py-3">Registro médico</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border first:border-t-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">{p.tipoIdentificacion || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.numeroIdentificacion}</td>
                    <td className="px-4 py-3 font-medium">{p.nombresCompletos}</td>
                    <td className="px-4 py-3">{p.especialidad}</td>
                    <td className="px-4 py-3">{p.sede}</td>
                    <td className="px-4 py-3">{p.consultorioSala ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.registroMedico ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.celular || p.email ? (
                        <div className="text-xs text-foreground/60">
                          {p.celular && <div>{p.celular}</div>}
                          {p.email && <div>{p.email}</div>}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          p.activo
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        disabled={modo !== null}
                        onClick={() => setHorarioDe(p)}
                        className="mr-2 rounded-md border border-primary px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                      >
                        Horario
                      </button>
                      <button
                        type="button"
                        disabled={modo !== null}
                        onClick={() => {
                          setEditarProfesional(p)
                          setModo('editar')
                        }}
                        className="mr-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted disabled:opacity-40"
                      >
                        Editar
                      </button>
                      {p.activo && (
                        <button
                          type="button"
                          onClick={() => inactivar(p)}
                          className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                        >
                          Inactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3 text-sm text-foreground/60">
            {filtrados.length} profesional{filtrados.length !== 1 ? 'es' : ''}
          </div>
        </div>
      )}
    </div>
  )
}

function FormProfesional({
  catalogo,
  profesional,
  guardando,
  onCancelar,
  onGuardar,
}: {
  catalogo: ReturnType<typeof useCatalogos>
  profesional: ProfesionalResumenDto | null
  guardando: boolean
  onCancelar: () => void
  onGuardar: (payload: CrearProfesionalRequest) => Promise<void>
}) {
  const esEdicion = profesional !== null
  const [tipoDoc, setTipoDoc] = useState(
    String(
      catalogo.tiposId.find((t) => t.nombre === profesional?.tipoIdentificacion)?.id ??
        catalogo.tiposId[0]?.id ??
        1,
    ),
  )
  const [numDoc, setNumDoc] = useState(profesional?.numeroIdentificacion ?? '')
  const [nombres, setNombres] = useState(profesional?.nombresCompletos ?? '')
  const [especialidadId, setEspecialidadId] = useState(
    String(profesional?.especialidadId ?? catalogo.especialidades[0]?.id ?? ''),
  )
  const [sedeId, setSedeId] = useState(
    String(profesional?.sedeId ?? catalogo.sedes[0]?.id ?? ''),
  )
  const [celular, setCelular] = useState(profesional?.celular ?? '')
  const [email, setEmail] = useState(profesional?.email ?? '')
  const [consultorio, setConsultorio] = useState(profesional?.consultorioSala ?? '')
  const [registro, setRegistro] = useState(profesional?.registroMedico ?? '')
  const [errors, setErrors] = useState<string[]>([])

  function validarYEnviar() {
    const e: string[] = []
    if (!nombres.trim()) e.push('Los nombres completos son obligatorios.')
    if (!especialidadId) e.push('La especialidad es obligatoria.')
    if (!sedeId) e.push('La sede es obligatoria.')
    if (!esEdicion && !numDoc.trim())
      e.push('El número de identificación es obligatorio.')
    setErrors(e)
    if (e.length > 0) return

    onGuardar({
      tipoIdentificacionId: Number(tipoDoc),
      numeroIdentificacion: numDoc.trim(),
      nombresCompletos: nombres.trim(),
      especialidadId: Number(especialidadId),
      sedeId: Number(sedeId),
      celular: celular || null,
      email: email || null,
      consultorioSala: consultorio || null,
      registroMedico: registro || null,
    })
  }

  return (
    <Seccion titulo={esEdicion ? 'Editar profesional' : 'Nuevo profesional'}>
      {errors.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor="pf-tipo-doc">
          Tipo de identificación
          <select
            id="pf-tipo-doc"
            value={tipoDoc}
            onChange={(e) => setTipoDoc(e.target.value)}
            disabled={esEdicion}
            className={inputCls}
          >
            {catalogo.tiposId.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="pf-documento">
          Número de identificación
          <input
            id="pf-documento"
            type="text"
            value={numDoc}
            onChange={(e) => setNumDoc(e.target.value)}
            disabled={esEdicion}
            className={inputCls}
          />
        </label>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium" htmlFor="pf-nombres">
            Nombres completos
            <input
              id="pf-nombres"
              type="text"
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
        <label className="block text-sm font-medium" htmlFor="pf-especialidad">
          Especialidad
          <select
            id="pf-especialidad"
            value={especialidadId}
            onChange={(e) => setEspecialidadId(e.target.value)}
            className={inputCls}
          >
            {catalogo.especialidades.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="pf-sede">
          Sede
          <select
            id="pf-sede"
            value={sedeId}
            onChange={(e) => setSedeId(e.target.value)}
            className={inputCls}
          >
            {catalogo.sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="pf-consultorio">
          Consultorio / Sala
          <input
            id="pf-consultorio"
            type="text"
            value={consultorio}
            onChange={(e) => setConsultorio(e.target.value)}
            placeholder="Ej. Consultorio 101"
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="pf-registro">
          Registro médico
          <input
            id="pf-registro"
            type="text"
            value={registro}
            onChange={(e) => setRegistro(e.target.value)}
            placeholder="Número de tarjeta profesional"
            className={inputCls}
          />
        </label>
      </div>

      <h3 className="mb-3 mt-6 border-t border-border pt-4 text-sm font-semibold">Contacto</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor="pf-celular">
          Celular
          <input
            id="pf-celular"
            type="tel"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="pf-email">
          Correo electrónico
          <input
            id="pf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={validarYEnviar}
          disabled={guardando}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar profesional'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
    </Seccion>
  )
}

// ══════════════════════════════════════════════════════════════
//  HORARIOS DE DISPONIBILIDAD (plantillas semanales por médico)
// ══════════════════════════════════════════════════════════════
const DIAS_SEMANA = [
  { id: 1, nombre: 'Lunes' },
  { id: 2, nombre: 'Martes' },
  { id: 3, nombre: 'Miércoles' },
  { id: 4, nombre: 'Jueves' },
  { id: 5, nombre: 'Viernes' },
  { id: 6, nombre: 'Sábado' },
  { id: 7, nombre: 'Domingo' },
]

function DisponibilidadView({
  profesionales,
  profesionalInicial,
  onVolver,
  showVolver = true,
  bloqueado = false,
}: {
  profesionales: ProfesionalResumenDto[]
  profesionalInicial: ProfesionalResumenDto | null
  onVolver: () => void
  showVolver?: boolean
  bloqueado?: boolean
}) {
  const catalogo = useCatalogos()
  const [profId, setProfId] = useState(
    profesionalInicial?.id ?? profesionales[0]?.id ?? 0,
  )
  const [plantillas, setPlantillas] = useState<DisponibilidadProfesionalDto[] | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [modo, setModo] = useState<'crear' | 'editar' | null>(null)
  const [editarPlantilla, setEditarPlantilla] =
    useState<DisponibilidadProfesionalDto | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [bloqueos, setBloqueos] = useState<BloqueoAgendaDto[]>([])
  const [excepciones, setExcepciones] = useState<ExcepcionHorariaDto[]>([])
  const [modoBloqueo, setModoBloqueo] = useState(false)
  const [modoExcepcion, setModoExcepcion] = useState(false)
  const [guardandoEsp, setGuardandoEsp] = useState(false)

  const profActual = profesionales.find((p) => p.id === profId)

  const recargar = () => {
    if (!profId) {
      setPlantillas([])
      setBloqueos([])
      setExcepciones([])
      setCargando(false)
      return
    }
    setCargando(true)
    setError(null)
    Promise.all([
      api.plantillasDisponibilidad(profId),
      api.bloqueosAgenda(profId),
      api.excepcionesHorarias(profId),
    ])
      .then(([p, b, e]) => {
        setPlantillas(p)
        setBloqueos(b)
        setExcepciones(e)
      })
      .catch((err) => setError(msgError(err)))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    if (!profId && profesionales.length > 0) {
      setProfId(profesionalInicial?.id ?? profesionales[0].id)
      return
    }
    recargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profId, profesionales, profesionalInicial])

  async function inactivar(p: DisponibilidadProfesionalDto) {
    if (!confirm(`¿Desea inactivar el horario del ${p.nombreDia} (${p.horaInicio}–${p.horaFin})?`)) {
      return
    }
    try {
      await api.inactivarDisponibilidad(p.id)
      setExito(`Horario del ${p.nombreDia} inactivado.`)
      recargar()
    } catch (e) {
      setError(msgError(e))
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <Cabecera
          titulo="Horarios de disponibilidad"
          sub="Defina en qué días y franjas horarias atiende cada profesional. Los slots libres de la agenda se calculan a partir de estas plantillas."
        />
        {showVolver && (
          <button
            type="button"
            onClick={onVolver}
            className="mt-1 shrink-0 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted"
          >
            ← Volver a profesionales
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <Aviso msg={error} />
        </div>
      )}
      {exito && (
        <div className="mb-4">
          <Exito msg={exito} />
        </div>
      )}

      <div className="mb-5 rounded-xl border border-border bg-white p-4">
        <label className="block max-w-sm text-sm font-medium" htmlFor="disp-prof">
          Profesional
          {bloqueado ? (
            <span
              id="disp-prof"
              className={`${inputCls} flex items-center gap-2`}
              aria-disabled="true"
            >
              <span className="truncate">{profActual?.nombresCompletos ?? '—'}</span>
            </span>
          ) : (
            <select
              id="disp-prof"
              value={profId}
              onChange={(e) => {
                setProfId(Number(e.target.value))
                setModo(null)
                setEditarPlantilla(null)
                setModoBloqueo(false)
                setModoExcepcion(false)
              }}
              className={inputCls}
            >
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombresCompletos}
                  {p.especialidad ? ` — ${p.especialidad}` : ''}
                </option>
              ))}
            </select>
          )}
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={modo !== null || !profId}
            onClick={() => {
              setEditarPlantilla(null)
              setModo('crear')
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Nueva plantilla
          </button>
        </div>
      </div>

      {modo && profId > 0 && (
        <FormDisponibilidad
          key={`${modo}-${editarPlantilla?.id ?? 'nuevo'}`}
          plantilla={editarPlantilla}
          sedes={catalogo.sedes}
          consultorioDefault={profActual?.consultorioSala ?? ''}
          guardando={guardando}
          onCancelar={() => {
            setModo(null)
            setEditarPlantilla(null)
          }}
          onGuardar={async (payload) => {
            setGuardando(true)
            setError(null)
            try {
              if (modo === 'crear') {
                await api.crearDisponibilidad({ ...payload, profesionalId: profId })
                setExito('Plantilla creada correctamente.')
              } else if (editarPlantilla) {
                await api.actualizarDisponibilidad(editarPlantilla.id, payload)
                setExito('Plantilla actualizada correctamente.')
              }
              setModo(null)
              setEditarPlantilla(null)
              recargar()
            } catch (e) {
              setError(msgError(e))
            } finally {
              setGuardando(false)
            }
          }}
        />
      )}

      {cargando && <Spinner />}

      {!cargando && plantillas && plantillas.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-foreground/60">
          {profId
            ? 'Este profesional no tiene horarios configurados. Cree una plantilla para generar slots disponibles.'
            : 'Seleccione un profesional para ver sus horarios.'}
        </div>
      )}

      {!cargando && plantillas && plantillas.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
                  <th className="px-4 py-3">Día</th>
                  <th className="px-4 py-3">Desde</th>
                  <th className="px-4 py-3">Hasta</th>
                  <th className="px-4 py-3">Duración turno</th>
                  <th className="px-4 py-3">Sede</th>
                  <th className="px-4 py-3">Consultorio</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plantillas.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border first:border-t-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-medium">{p.nombreDia}</td>
                    <td className="px-4 py-3">{p.horaInicio}</td>
                    <td className="px-4 py-3">{p.horaFin}</td>
                    <td className="px-4 py-3">{p.duracionMinutos} min</td>
                    <td className="px-4 py-3">{p.sede ?? '—'}</td>
                    <td className="px-4 py-3">{p.consultorioSala ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        disabled={modo !== null}
                        onClick={() => {
                          setEditarPlantilla(p)
                          setModo('editar')
                        }}
                        className="mr-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted disabled:opacity-40"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => inactivar(p)}
                        className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                      >
                        Inactivar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3 text-sm text-foreground/60">
            {plantillas.length} plantilla{plantillas.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* ── Bloqueos de agenda (vacaciones, congresos, descanso) ── */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Bloqueos de agenda</h2>
          <button
            type="button"
            disabled={modoBloqueo || !profId}
            onClick={() => setModoBloqueo(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Nuevo bloqueo
          </button>
        </div>
        <p className="mb-4 text-sm text-foreground/60">
          Vacaciones, congresos o descansos que suspenden la atención. Si indica hora de inicio y fin,
          solo se bloquea esa franja del día (por ejemplo, almuerzo).
        </p>

        {modoBloqueo && (
          <FormBloqueo
            guardando={guardandoEsp}
            onCancelar={() => setModoBloqueo(false)}
            onGuardar={async (payload) => {
              setGuardandoEsp(true)
              setError(null)
              try {
                await api.crearBloqueoAgenda({ ...payload, profesionalId: profId })
                setExito('Bloqueo creado correctamente.')
                setModoBloqueo(false)
                recargar()
              } catch (e) {
                setError(msgError(e))
              } finally {
                setGuardandoEsp(false)
              }
            }}
          />
        )}

        {bloqueos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-8 text-center text-sm text-foreground/60">
            No hay bloqueos configurados para este profesional.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
                    <th className="px-4 py-3">Desde</th>
                    <th className="px-4 py-3">Hasta</th>
                    <th className="px-4 py-3">Franja</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {bloqueos.map((b) => (
                    <tr
                      key={b.id}
                      className="border-t border-border first:border-t-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">{b.fechaDesde}</td>
                      <td className="px-4 py-3">{b.fechaHasta}</td>
                      <td className="px-4 py-3">
                        {b.horaInicio && b.horaFin
                          ? `${b.horaInicio}–${b.horaFin}`
                          : 'Día completo'}
                      </td>
                      <td className="px-4 py-3">{b.motivo}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !confirm(
                                `¿Desea inactivar el bloqueo "${b.motivo}" del ${b.fechaDesde} al ${b.fechaHasta}?`,
                              )
                            )
                              return
                            try {
                              await api.inactivarBloqueoAgenda(b.id)
                              setExito('Bloqueo inactivado.')
                              recargar()
                            } catch (e) {
                              setError(msgError(e))
                            }
                          }}
                          className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                        >
                          Inactivar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3 text-sm text-foreground/60">
              {bloqueos.length} bloqueo{bloqueos.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* ── Excepciones horarias (días puntuales con horario distinto) ── */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Excepciones horarias</h2>
          <button
            type="button"
            disabled={modoExcepcion || !profId}
            onClick={() => setModoExcepcion(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Nueva excepción
          </button>
        </div>
        <p className="mb-4 text-sm text-foreground/60">
          Un día puntual en que el profesional atiende con un horario distinto al de su plantilla
          semanal (jornada reducida, campaña, puente…). Reemplaza la plantilla de ese día.
        </p>

        {modoExcepcion && (
          <FormExcepcion
            guardando={guardandoEsp}
            onCancelar={() => setModoExcepcion(false)}
            onGuardar={async (payload) => {
              setGuardandoEsp(true)
              setError(null)
              try {
                await api.crearExcepcionHoraria({ ...payload, profesionalId: profId })
                setExito('Excepción horaria creada correctamente.')
                setModoExcepcion(false)
                recargar()
              } catch (e) {
                setError(msgError(e))
              } finally {
                setGuardandoEsp(false)
              }
            }}
          />
        )}

        {excepciones.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-8 text-center text-sm text-foreground/60">
            No hay excepciones horarias para este profesional.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Desde</th>
                    <th className="px-4 py-3">Hasta</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {excepciones.map((x) => (
                    <tr
                      key={x.id}
                      className="border-t border-border first:border-t-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">{x.fecha}</td>
                      <td className="px-4 py-3">{x.horaInicio}</td>
                      <td className="px-4 py-3">{x.horaFin}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`¿Desea inactivar la excepción del ${x.fecha}?`)) return
                            try {
                              await api.inactivarExcepcionHoraria(x.id)
                              setExito('Excepción horaria inactivada.')
                              recargar()
                            } catch (e) {
                              setError(msgError(e))
                            }
                          }}
                          className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                        >
                          Inactivar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3 text-sm text-foreground/60">
              {excepciones.length} excepción{excepciones.length !== 1 ? 'es' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FormDisponibilidad({
  plantilla,
  sedes,
  consultorioDefault,
  guardando,
  onCancelar,
  onGuardar,
}: {
  plantilla: DisponibilidadProfesionalDto | null
  sedes: SedeDto[]
  consultorioDefault: string
  guardando: boolean
  onCancelar: () => void
  onGuardar: (payload: ActualizarDisponibilidadRequest) => Promise<void>
}) {
  const esEdicion = plantilla !== null
  const [dia, setDia] = useState(String(plantilla?.diaSemana ?? 1))
  const [hInicio, setHInicio] = useState(plantilla?.horaInicio ?? '08:00')
  const [hFin, setHFin] = useState(plantilla?.horaFin ?? '12:00')
  const [dur, setDur] = useState(String(plantilla?.duracionMinutos ?? 30))
  const [sede, setSede] = useState(plantilla?.sedeId ? String(plantilla.sedeId) : '')
  const [consultorio, setConsultorio] = useState(
    plantilla?.consultorioSala ?? consultorioDefault,
  )
  const [errors, setErrors] = useState<string[]>([])

  function validarYEnviar() {
    const e: string[] = []
    if (!hInicio || !hFin) {
      e.push('Debe indicar hora de inicio y fin.')
    } else if (hFin <= hInicio) {
      e.push('La hora de fin debe ser posterior a la hora de inicio.')
    }
    setErrors(e)
    if (e.length > 0) return

    onGuardar({
      diaSemana: Number(dia),
      horaInicio: hInicio,
      horaFin: hFin,
      duracionMinutos: Number(dur),
      sedeId: sede ? Number(sede) : null,
      consultorioSala: consultorio.trim() || null,
    })
  }

  return (
    <Seccion titulo={esEdicion ? 'Editar horario' : 'Nuevo horario'}>
      {errors.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-medium" htmlFor="disp-dia">
          Día de la semana
          <select
            id="disp-dia"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className={inputCls}
          >
            {DIAS_SEMANA.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="disp-inicio">
          Hora de inicio
          <input
            id="disp-inicio"
            type="time"
            value={hInicio}
            onChange={(e) => setHInicio(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="disp-fin">
          Hora de fin
          <input
            id="disp-fin"
            type="time"
            value={hFin}
            onChange={(e) => setHFin(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="disp-duracion">
          Duración turno
          <select
            id="disp-duracion"
            value={dur}
            onChange={(e) => setDur(e.target.value)}
            className={inputCls}
          >
            {[15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutos
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="disp-sede">
          Sede
          <select
            id="disp-sede"
            value={sede}
            onChange={(e) => setSede(e.target.value)}
            className={inputCls}
          >
            <option value="">Sin sede</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="disp-consultorio">
          Consultorio / Sala
          <input
            id="disp-consultorio"
            type="text"
            value={consultorio}
            onChange={(e) => setConsultorio(e.target.value)}
            placeholder="Ej. Consultorio 202"
            className={inputCls}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={validarYEnviar}
          disabled={guardando}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Guardar plantilla'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
    </Seccion>
  )
}

// ── Formulario de bloqueo de agenda (vacaciones, descanso, franja) ──
function FormBloqueo({
  guardando,
  onCancelar,
  onGuardar,
}: {
  guardando: boolean
  onCancelar: () => void
  onGuardar: (payload: Omit<CrearBloqueoAgendaRequest, 'profesionalId'>) => Promise<void>
}) {
  const [motivo, setMotivo] = useState('')
  const [fechaDesde, setFechaDesde] = useState(hoyISO())
  const [fechaHasta, setFechaHasta] = useState(hoyISO())
  const [franja, setFranja] = useState(false)
  const [hInicio, setHInicio] = useState('13:00')
  const [hFin, setHFin] = useState('14:00')
  const [errors, setErrors] = useState<string[]>([])

  function validarYEnviar() {
    const e: string[] = []
    if (!motivo.trim()) e.push('Debe indicar un motivo.')
    if (!fechaDesde || !fechaHasta) {
      e.push('Debe indicar la fecha de inicio y fin.')
    } else if (fechaHasta < fechaDesde) {
      e.push('La fecha final no puede ser anterior a la inicial.')
    }
    if (franja) {
      if (!hInicio || !hFin) {
        e.push('Debe indicar hora de inicio y fin de la franja.')
      } else if (hFin <= hInicio) {
        e.push('La hora de fin debe ser posterior a la hora de inicio.')
      }
    }
    setErrors(e)
    if (e.length > 0) return

    onGuardar({
      fechaDesde,
      fechaHasta,
      motivo: motivo.trim(),
      horaInicio: franja ? hInicio : null,
      horaFin: franja ? hFin : null,
    })
  }

  return (
    <Seccion titulo="Nuevo bloqueo de agenda">
      {errors.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-medium" htmlFor="blq-motivo">
          Motivo
          <input
            id="blq-motivo"
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. Vacaciones, congreso, almuerzo…"
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="blq-desde">
          Fecha desde
          <input
            id="blq-desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="blq-hasta">
          Fecha hasta
          <input
            id="blq-hasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
          <input
            type="checkbox"
            checked={franja}
            onChange={(e) => setFranja(e.target.checked)}
            className="h-4 w-4"
          />
          Bloquear solo una franja del día (dejar el resto disponible)
        </label>
        {franja && (
          <>
            <label className="block text-sm font-medium" htmlFor="blq-hinicio">
              Hora de inicio
              <input
                id="blq-hinicio"
                type="time"
                value={hInicio}
                onChange={(e) => setHInicio(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block text-sm font-medium" htmlFor="blq-hfin">
              Hora de fin
              <input
                id="blq-hfin"
                type="time"
                value={hFin}
                onChange={(e) => setHFin(e.target.value)}
                className={inputCls}
              />
            </label>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={validarYEnviar}
          disabled={guardando}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar bloqueo'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
    </Seccion>
  )
}

// ── Formulario de excepción horaria (día puntual con horario distinto) ──
function FormExcepcion({
  guardando,
  onCancelar,
  onGuardar,
}: {
  guardando: boolean
  onCancelar: () => void
  onGuardar: (payload: Omit<CrearExcepcionHorariaRequest, 'profesionalId'>) => Promise<void>
}) {
  const [fecha, setFecha] = useState(hoyISO())
  const [hInicio, setHInicio] = useState('08:00')
  const [hFin, setHFin] = useState('12:00')
  const [errors, setErrors] = useState<string[]>([])

  function validarYEnviar() {
    const e: string[] = []
    if (!fecha) e.push('Debe indicar la fecha.')
    if (!hInicio || !hFin) {
      e.push('Debe indicar hora de inicio y fin.')
    } else if (hFin <= hInicio) {
      e.push('La hora de fin debe ser posterior a la hora de inicio.')
    }
    setErrors(e)
    if (e.length > 0) return

    onGuardar({ fecha, horaInicio: hInicio, horaFin: hFin })
  }

  return (
    <Seccion titulo="Nueva excepción horaria">
      {errors.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-medium" htmlFor="exc-fecha">
          Fecha
          <input
            id="exc-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="exc-inicio">
          Hora de inicio
          <input
            id="exc-inicio"
            type="time"
            value={hInicio}
            onChange={(e) => setHInicio(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="exc-fin">
          Hora de fin
          <input
            id="exc-fin"
            type="time"
            value={hFin}
            onChange={(e) => setHFin(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={validarYEnviar}
          disabled={guardando}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar excepción'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
    </Seccion>
  )
}

// ══════════════════════════════════════════════════════════════
//  CATÁLOGOS — MANTENIMIENTO (Fase 1)
// ══════════════════════════════════════════════════════════════
function CatalogosView() {
  const [catalogoActivo, setCatalogoActivo] = useState<CatalogoDefinicion | null>(null)
  const [defs, setDefs] = useState<CatalogoDefinicion[]>([])
  const [defsError, setDefsError] = useState<string | null>(null)
  const [defsCargando, setDefsCargando] = useState(true)

  useEffect(() => {
    api
      .catalogosAdmin()
      .then(setDefs)
      .catch((e) => setDefsError(msgError(e)))
      .finally(() => setDefsCargando(false))
  }, [])

  if (catalogoActivo) {
    return (
      <AdminCatalogoView
        definicion={catalogoActivo}
        onVolver={() => setCatalogoActivo(null)}
      />
    )
  }

  return (
    <div>
      <Cabecera
        titulo="Catálogos"
        sub="Datos de referencia del sistema. Seleccione un catálogo para administrarlo."
      />

      {defsError && <Aviso msg={defsError} />}

      <Seccion titulo="Catálogos administrables">
        {defsCargando ? (
          <Spinner texto="Cargando catálogos…" />
        ) : defs.length === 0 ? (
          <p className="text-sm text-foreground/60">No hay catálogos administrables.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {defs.map((d) => (
              <button
                key={d.tabla}
                type="button"
                onClick={() => setCatalogoActivo(d)}
                className="rounded-lg border border-border bg-white p-5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="block text-base font-semibold">{d.etiqueta}</span>
                  {d.permiteActivos && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {d.conteoActivos} act. · {d.conteoInactivos} inac.
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-sm text-foreground/60">{d.descripcion}</span>
                <span className="mt-3 inline-block rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Administrar →
                </span>
              </button>
            ))}
          </div>
        )}
      </Seccion>
    </div>
  )
}

// ── Panel de administración de un catálogo (master/detail) ────
type CampoFormulario = {
  campo: string
  etiqueta: string
  tipo: 'Texto' | 'Numero' | 'Logico'
  requerido: boolean
  valor: string | boolean
}

function AdminCatalogoView({
  definicion,
  onVolver,
}: {
  definicion: CatalogoDefinicion
  onVolver: () => void
}) {
  const [datos, setDatos] = useState<ResultadoCatalogo | null>(null)
  const [termino, setTermino] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [filtroPadre, setFiltroPadre] = useState('')
  const [opcionesPadre, setOpcionesPadre] = useState<{ id: string; etiqueta: string }[]>([])
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const [modo, setModo] = useState<'crear' | 'editar' | null>(null)
  const [editarFila, setEditarFila] = useState<CatalogoFila | null>(null)
  const [camposForm, setCamposForm] = useState<CampoFormulario[]>([])
  const [guardando, setGuardando] = useState(false)

  // Diálogo de dependencias
  const [dependencias, setDependencias] = useState<DependenciaCatalogo[] | null>(null)
  const [filaDependencias, setFilaDependencias] = useState<CatalogoFila | null>(null)
  const [confirmaBorrar, setConfirmaBorrar] = useState<CatalogoFila | null>(null)

  const cargar = (pag: number) => {
    setCargando(true)
    setError(null)
    api
      .catalogoAdminListar(definicion.tabla, {
        termino: termino || undefined,
        pagina: pag,
        tamPagina: 20,
        soloActivos,
        filtroPadre: filtroPadre || undefined,
      })
      .then((r) => {
        setDatos(r)
        setPagina(r.pagina)
      })
      .catch((e) => setError(msgError(e)))
      .finally(() => setCargando(false))
  }

  // Carga las opciones del catálogo padre para poblarmos el select (ej. Departamento).
  useEffect(() => {
    if (!definicion.padre) return
    api
      .catalogoAdminListar(definicion.padre.tabla, {
        tamPagina: 100,
        soloActivos: true,
      })
      .then((r) => {
        setOpcionesPadre(
          r.items.map((i) => ({
            id: String(i.valores[definicion.padre!.campoClave] ?? i.id),
            etiqueta: String(i.valores[definicion.padre!.campoEtiqueta] ?? i.id),
          })),
        )
      })
      .catch(() => setOpcionesPadre([]))
  }, [definicion.padre])

  useEffect(() => {
    cargar(pagina)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termino, soloActivos, pagina, filtroPadre])

  function abrirCrear() {
    setEditarFila(null)
    setCamposForm(
      definicion.campos
        .filter((c) => definicion.permiteActivos || c.campo !== 'activo')
        .map((c) => {
          const valorInicial =
            c.tipo === 'Logico'
              ? false
              : !definicion.padre || c.campo !== definicion.padre.campoPadre
                ? ''
                : filtroPadre
          return {
            campo: c.campo,
            etiqueta: c.etiqueta,
            tipo: c.tipo as CampoFormulario['tipo'],
            requerido: c.requerido,
            valor: valorInicial,
          }
        }),
    )
    setModo('crear')
  }

  function abrirEditar(fila: CatalogoFila) {
    setEditarFila(fila)
    setCamposForm(
      definicion.campos
        .filter((c) => definicion.permiteActivos || c.campo !== 'activo')
        .map((c) => {
        const v = fila.valores[c.campo]
        return {
          campo: c.campo,
          etiqueta: c.etiqueta,
          tipo: c.tipo as CampoFormulario['tipo'],
          requerido: c.requerido,
          valor: c.tipo === 'Logico' ? Boolean(v) : (v ?? ''),
        } as CampoFormulario
      }),
    )
    setModo('editar')
  }

  async function guardar() {
    const faltan = camposForm.filter(
      (c) => c.requerido && (c.tipo === 'Logico' ? false : !String(c.valor).trim()),
    )
    if (faltan.length > 0) {
      setError(`Complete los campos requeridos: ${faltan.map((c) => c.etiqueta).join(', ')}.`)
      return
    }

    const payload: Record<string, unknown> = {}
    for (const c of camposForm) {
      payload[c.campo] =
        c.tipo === 'Numero' ? Number(c.valor) : c.tipo === 'Logico' ? c.valor : String(c.valor)
    }

    setGuardando(true)
    setError(null)
    setExito(null)
    try {
      if (modo === 'crear') {
        await api.catalogoAdminCrear(definicion.tabla, payload)
        setExito('Registro creado correctamente.')
      } else if (editarFila) {
        await api.catalogoAdminActualizar(definicion.tabla, editarFila.id, payload)
        setExito('Registro actualizado correctamente.')
      }
      setModo(null)
      cargar(1)
    } catch (e) {
      setError(msgError(e))
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(fila: CatalogoFila) {
    try {
      const activo = Boolean(fila.valores.activo)
      if (activo) await api.catalogoAdminInactivar(definicion.tabla, fila.id)
      else await api.catalogoAdminReactivar(definicion.tabla, fila.id)
      setExito(activo ? 'Registro desactivado.' : 'Registro activado.')
      cargar(pagina)
    } catch (e) {
      setError(msgError(e))
    }
  }

  async function verificarDependencias(fila: CatalogoFila) {
    setError(null)
    try {
      const deps = await api.catalogoAdminDependencias(definicion.tabla, fila.id)
      if (deps.some((d) => d.conteo > 0)) {
        setDependencias(deps)
        setFilaDependencias(fila)
        return
      }
      setConfirmaBorrar(fila)
    } catch (e) {
      setError(msgError(e))
    }
  }

  async function borrarPermanente() {
    if (!confirmaBorrar) return
    try {
      await api.catalogoAdminBorrar(definicion.tabla, confirmaBorrar.id)
      setConfirmaBorrar(null)
      setExito('Registro borrado definitivamente.')
      cargar(1)
    } catch (e) {
      setError(msgError(e))
      setConfirmaBorrar(null)
    }
  }

  function formatoValor(v: string | number | boolean | null): string {
    if (v === null || v === undefined) return '—'
    if (typeof v === 'boolean') return v ? 'Sí' : 'No'
    return String(v)
  }

  const camposTabla = definicion.campos.filter((c) => c.tipo !== 'Logico')
  const tieneLogico = definicion.campos.some((c) => c.tipo === 'Logico')

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Cabecera
          titulo={definicion.etiqueta}
          sub={definicion.descripcion}
        />
        <button
          type="button"
          onClick={onVolver}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
        >
          ← Volver
        </button>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso msg={error} />
        </div>
      )}
      {exito && (
        <div className="mb-4">
          <Exito msg={exito} />
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-white p-4">
        <label className="text-sm font-medium">
          Buscar
          <input
            type="search"
            value={termino}
            onChange={(e) => {
              setTermino(e.target.value)
              setPagina(1)
            }}
            placeholder="Buscar…"
            className={inputCls}
          />
        </label>
        {definicion.padre && (
          <label className="text-sm font-medium">
            {definicion.padre.etiqueta}
            <select
              value={filtroPadre}
              onChange={(e) => {
                setFiltroPadre(e.target.value)
                setPagina(1)
              }}
              className={inputCls}
            >
              <option value="">Todos</option>
              {opcionesPadre.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </label>
        )}
        {definicion.permiteActivos && (
          <label className="flex items-center gap-2 pb-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => {
                setSoloActivos(e.target.checked)
                setPagina(1)
              }}
              className="h-4 w-4"
            />
            Solo activos
          </label>
        )}
        {datos && !cargando && (
          <span className="pb-2 text-sm text-foreground/60">
            {datos.total} registro{datos.total === 1 ? '' : 's'}
          </span>
        )}
        <button
          type="button"
          onClick={abrirCrear}
          className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          + Nuevo registro
        </button>
      </div>

      {modo && (
        <Seccion titulo={modo === 'crear' ? `Nuevo ${definicion.etiqueta}` : `Editar ${definicion.etiqueta}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            {camposForm.map((c) =>
              c.tipo === 'Logico' ? (
                <label key={c.campo} className="flex items-center gap-2 pt-6 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={Boolean(c.valor)}
                    onChange={(e) =>
                      setCamposForm((prev) =>
                        prev.map((p) =>
                          p.campo === c.campo ? { ...p, valor: e.target.checked } : p,
                        ),
                      )
                    }
                    className="h-4 w-4"
                  />
                  {c.etiqueta}
                </label>
              ) : (
                <label key={c.campo} className="block text-sm font-medium">
                  {c.etiqueta}
                  {c.requerido && <span className="text-rose-600"> *</span>}
                  <input
                    type={c.tipo === 'Numero' ? 'number' : 'text'}
                    value={String(c.valor)}
                    onChange={(e) =>
                      setCamposForm((prev) =>
                        prev.map((p) =>
                          p.campo === c.campo ? { ...p, valor: e.target.value } : p,
                        ),
                      )
                    }
                    className={inputCls}
                  />
                </label>
              ),
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setModo(null)}
              disabled={guardando}
              className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        </Seccion>
      )}

      {cargando && <Spinner />}

      {!cargando && datos && datos.items.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-foreground/60">
          No hay registros con los criterios indicados.
        </div>
      )}

      {!cargando && datos && datos.items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
                  {camposTabla.map((c) => (
                    <th key={c.campo} className="px-4 py-3">{c.etiqueta}</th>
                  ))}
                  {tieneLogico && <th className="px-4 py-3">Requiere validación</th>}
                  {definicion.permiteActivos && <th className="px-4 py-3">Estado</th>}
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((f) => (
                  <tr key={f.id} className="border-t border-border first:border-t-0 hover:bg-muted/40">
                    {camposTabla.map((c) => (
                      <td key={c.campo} className="px-4 py-3">
                        {formatoValor(f.valores[c.campo])}
                      </td>
                    ))}
                    {tieneLogico && (
                      <td className="px-4 py-3">{formatoValor(f.valores.requiereValidacion)}</td>
                    )}
                    {definicion.permiteActivos && (
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            f.valores.activo
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {f.valores.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => abrirEditar(f)}
                        className="mr-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted"
                      >
                        Editar
                      </button>
                      {definicion.permiteActivos && (
                        <button
                          type="button"
                          onClick={() => toggleActivo(f)}
                          className={`mr-2 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                            f.valores.activo
                              ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {f.valores.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => verificarDependencias(f)}
                        className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {datos.totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-foreground/60">
              <span>
                Página {datos.pagina} de {datos.totalPaginas} · {datos.total} registros
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={datos.pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={datos.pagina >= datos.totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Diálogo de dependencias */}
      {dependencias && filaDependencias && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-rose-800">No se puede borrar</h3>
            <p className="mt-2 text-sm text-foreground/70">
                {definicion.permiteActivos
                  ? 'Este registro está en uso. Puede desactivarlo en lugar de borrarlo.'
                  : 'Este registro está en uso y no se puede borrar.'}
              </p>
            <ul className="mt-4 space-y-2">
              {dependencias.map((d) => (
                <li
                  key={d.entidad}
                  className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm"
                >
                  <span>{d.descripcion}</span>
                  <span className="font-semibold text-amber-800">{d.conteo}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDependencias(null)
                  setFilaDependencias(null)
                }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
              >
                Cerrar
              </button>
              {definicion.permiteActivos && (
                <button
                  type="button"
                  onClick={() => {
                    setDependencias(null)
                    toggleActivo(filaDependencias)
                  }}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Desactivar registro
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de borrado permanente */}
      {confirmaBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold">¿Borrar definitivamente?</h3>
            <p className="mt-2 text-sm text-foreground/70">
              El registro <span className="font-semibold">{confirmaBorrar.id}</span> se eliminará de
              forma permanente. Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmaBorrar(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={borrarPermanente}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
              >
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}