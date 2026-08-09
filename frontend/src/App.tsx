import { useEffect, useState } from 'react'
import { api, ApiError } from './lib/api'
import { useConfigBusqueda } from './lib/configBusqueda'
import BuscadorAseguradora from './components/BuscadorAseguradora'
import VentanaConfigBusqueda from './components/VentanaConfigBusqueda'
import type {
  AgendaDiaItemDto,
  AseguradoraDto,
  CatalogoDefinicion,
  CatalogoFila,
  CitaDto,
  DependenciaCatalogo,
  EspecialidadDto,
  PacienteDto,
  PacienteListaDto,
  ProfesionalResumenDto,
  ResultadoCatalogo,
  SedeDto,
  TipoCitaDto,
  TipoIdentificacionDto,
  TipoUsuarioDto,
} from './lib/types'

type Vista = 'agenda' | 'nueva-cita' | 'pacientes' | 'catalogos'

const NAV: { id: Vista; label: string }[] = [
  { id: 'agenda', label: 'Agenda del día' },
  { id: 'nueva-cita', label: 'Nueva cita' },
  { id: 'pacientes', label: 'Pacientes' },
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

function formatFecha(iso: string): string {
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
    ])
      .then(([es, se, pr, tc, ti, asko, tus]) => {
        setEspecialidades(es)
        setSedes(se)
        setProfesionales(pr)
        setTiposCita(tc)
        setTiposId(ti)
        setAseguradoras(asko)
        setTiposUsuario(tus)
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
    error,
    cargando,
  }
}

export default function App() {
  const [vista, setVista] = useState<Vista>('agenda')
  const [configAbierta, setConfigAbierta] = useState(false)

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
                onClick={() => setVista(n.id)}
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
          {vista === 'agenda' && <AgendaView />}
          {vista === 'nueva-cita' && <NuevaCitaView />}
          {vista === 'pacientes' && <PacientesView />}
          {vista === 'catalogos' && <CatalogosView />}
        </main>
      </div>

      <VentanaConfigBusqueda abierta={configAbierta} onCerrar={() => setConfigAbierta(false)} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  AGENDA DEL DÍA — Timeline multi-recurso (Fase 1)
// ══════════════════════════════════════════════════════════════
type FilaAgenda = { profesional: ProfesionalResumenDto; items: AgendaDiaItemDto[] }

/** "08:30" → 510 (minutos del día). */
function aMinutos(hm: string): number {
  const [h, m] = String(hm).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function AgendaView() {
  const catalogo = useCatalogos()
  const [profIds, setProfIds] = useState<number[]>([])
  const [fecha, setFecha] = useState(hoyISO())
  const [filas, setFilas] = useState<FilaAgenda[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profIds.length === 0) {
      setFilas([])
      return
    }
    setCargando(true)
    setError(null)
    const seleccionados = catalogo.profesionales.filter((p) => profIds.includes(p.id))
    Promise.all(
      seleccionados.map((p) =>
        api.agendaDia({ profesionalId: p.id, fecha }).then((items) => ({ p, items })),
      ),
    )
      .then((rs) => setFilas(rs.map(({ p, items }) => ({ profesional: p, items }))))
      .catch((e) => setError(msgError(e)))
      .finally(() => setCargando(false))
  }, [profIds, fecha, catalogo.profesionales])

  function toggleProf(id: number) {
    setProfIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div>
      <Cabecera
        titulo="Agenda del día"
        sub="Línea de tiempo diaria con una fila por profesional. Seleccione uno o varios."
      />

      <div className="mb-5 rounded-xl border border-border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[280px] flex-1">
            <p className="mb-2 text-sm font-medium">Profesionales</p>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
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
          <label className="text-sm font-medium">
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
      </div>

      {error && <Aviso msg={error} />}
      {cargando && <Spinner />}

      {!cargando && profIds.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-foreground/60">
          Seleccione al menos un profesional para ver la agenda del día.
        </div>
      )}

      {!cargando && profIds.length > 0 && filas.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-foreground/60">
          No hay citas programadas para esta fecha y los profesionales seleccionados.
        </div>
      )}

      {!cargando && filas.length > 0 && <TimelineDia filas={filas} />}
    </div>
  )
}

const HORA_INICIO = 6 * 60 // 06:00
const HORA_FIN = 21 * 60 // 21:00
const PX_POR_HORA = 56 // px por hora en la escala
const ANCHO_COL = 180 // columna izquierda (profesional)
const pxHora = (min: number) => ((min - HORA_INICIO) / 60) * PX_POR_HORA
const horasEje = Array.from(
  { length: (HORA_FIN - HORA_INICIO) / 60 + 1 },
  (_, i) => HORA_INICIO + i * 60,
)

/** Línea de tiempo diaria: fila por profesional, bloques posicionados por hora. */
function TimelineDia({ filas }: { filas: FilaAgenda[] }) {
  const rango = HORA_FIN - HORA_INICIO
  const todas = filas.flatMap((f) => f.items)
  const vacias = todas.length === 0

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div
            className="relative border-b border-border bg-muted"
            style={{ height: 44, marginLeft: ANCHO_COL }}
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

          {vacias ? (
            <div className="border-t border-border p-10 text-center text-sm text-foreground/60">
              No hay citas programadas para estas filas.
            </div>
          ) : (
            filas.map((f) => {
              return (
                <div key={f.profesional.id} className="relative border-t border-border">
                  <div
                    className="absolute inset-y-0 left-0 z-10 bg-background px-3 py-2"
                    style={{ width: ANCHO_COL, borderRight: '1px solid var(--border)' }}
                  >
                    <p className="truncate text-sm font-semibold">{f.profesional.nombresCompletos}</p>
                    <p className="truncate text-xs text-foreground/60">{f.profesional.especialidad}</p>
                  </div>
                  <div
                    className="relative"
                    style={{ marginLeft: ANCHO_COL, height: 76 }}
                  >
                    {horasEje.map((h) => (
                      <span
                        key={h}
                        className="pointer-events-none absolute inset-y-0 border-l border-border/60"
                        style={{ left: pxHora(h) }}
                      />
                    ))}
                    {f.items.map((i) => {
                      const inicio = aMinutos(i.horaInicio)
                      const fin = aMinutos(i.horaFin) || inicio
                      const left = ((inicio - HORA_INICIO) / rango) * 100
                      const width = ((fin - inicio) / rango) * 100
                      return (
                        <button
                          key={i.citaId}
                          type="button"
                          title={`${i.horaInicio}–${i.horaFin} · ${i.paciente}`}
                          className="absolute top-1.5 flex h-[64px] flex-col overflow-hidden rounded-md border px-2 py-1 text-left text-[11px] leading-tight transition-colors hover:z-20 hover:brightness-95"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            minWidth: 70,
                            borderColor: 'currentColor',
                            backgroundColor: 'color-mix(in srgb, currentColor 12%, white)',
                            color: {
                              1: '#0369a1',
                              2: '#047857',
                              3: '#b45309',
                              4: '#0f766e',
                              5: '#be123c',
                              6: '#475569',
                              7: '#6d28d9',
                            }[i.estadoId] ?? '#475569',
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
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <TimelineDetalle filas={filas} />
    </div>
  )
}

/** Tabla de detalle debajo de la timeline, reutilizando estadoBadge (1-7). */
function TimelineDetalle({ filas }: { filas: FilaAgenda[] }) {
  const items = filas.flatMap((f) => f.items)
  if (items.length === 0) return null
  return (
    <div className="border-t border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
              <th className="px-4 py-3">Profesional</th>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Identificación</th>
              <th className="px-4 py-3">Edad</th>
              <th className="px-4 py-3">Tipo de cita</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Aseguradora</th>
              <th className="px-4 py-3">Régimen</th>
              <th className="px-4 py-3">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const profesional = filas.find(
                (f) => f.items.some((x) => x.citaId === i.citaId),
              )?.profesional
              return (
                <tr key={i.citaId} className="border-t border-border first:border-t-0 hover:bg-muted/40">
                  <td className="whitespace-nowrap px-4 py-3">{profesional?.nombresCompletos ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{i.horaInicio}</td>
                  <td className="px-4 py-3">{i.paciente}</td>
                  <td className="px-4 py-3">{i.identificacion}</td>
                  <td className="px-4 py-3">{i.edadPaciente} años</td>
                  <td className="px-4 py-3">{i.tipoCita}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${estadoBadge(
                        i.estadoId,
                      )}`}
                    >
                      {i.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">{i.aseguradora ?? '—'}</td>
                  <td className="px-4 py-3">{i.regimen ?? '—'}</td>
                  <td className="px-4 py-3">{i.motivoConsulta ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  NUEVA CITA
// ══════════════════════════════════════════════════════════════
function NuevaCitaView() {
  const catalogo = useCatalogos()
  const configBusqueda = useConfigBusqueda()
  const [docBusqueda, setDocBusqueda] = useState('')
  const [pacientes, setPacientes] = useState<PacienteListaDto | null>(null)
  const [pacienteId, setPacienteId] = useState<number | null>(null)
  const [pacienteNombre, setPacienteNombre] = useState('')
  const [profId, setProfId] = useState<number | null>(null)
  const [tipoCitaId, setTipoCitaId] = useState<number | null>(null)
  const [fechaHora, setFechaHora] = useState('')
  const [motivo, setMotivo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [aseguradoraId, setAseguradoraId] = useState<number | null>(null)
  const [tipoUsuarioId, setTipoUsuarioId] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<CitaDto | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      const creada = await api.crearCita({
        fechaHora: new Date(fechaHora).toISOString(),
        pacienteId,
        profesionalId: profId,
        tipoCitaId,
        aseguradoraId: aseguradoraId ?? undefined,
        tipoUsuarioId: tipoUsuarioId ?? undefined,
        motivoConsulta: motivo || null,
        observaciones: observaciones || null,
      })
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

      {error && (
        <div className="mb-4">
          <Aviso msg={error} />
        </div>
      )}

      {resultado && (
        <div className="mb-4">
          <Exito
            msg={`Cita creada: #${resultado.id} — ${resultado.paciente.nombresCompletos} · ${formatFechaHora(
              resultado.fechaHora,
            )} · ${resultado.tipoCita.nombre} (${resultado.estado})`}
          />
        </div>
      )}

      <Seccion titulo="Paciente">
        <label className="block text-sm font-medium" htmlFor="buscar-paciente">
          Buscar por nombre o documento
          <input
            id="buscar-paciente"
            type="search"
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
              onChange={(e) => setProfId(e.target.value ? Number(e.target.value) : null)}
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
              onChange={(e) => setFechaHora(e.target.value)}
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

      <button
        type="button"
        onClick={enviar}
        disabled={enviando}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? 'Registrando…' : 'Registrar cita'}
      </button>
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