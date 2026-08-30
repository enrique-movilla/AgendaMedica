// ============================================================
//  SINCORA — IDENTIDAD DE APLICACIÓN
//  Proyecto : AgendaMedica / frontend / src / components
//  Archivo  : IdentidadView.tsx
// ============================================================
//  Vista para cambiar la vertical de negocio y gestionar
//  el catálogo de términos paramétricos.
// ============================================================

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../lib/api'
import { useCatalogo } from '../context/CatalogoContext.tsx'
import type { CatalogoTerminoDto, ClaveTermino } from '../lib/types'

// Mapeo enum numérico → string (mismo que en CatalogoContext)
const NUM_A_CLAVE: Record<number, string> = {
  1: 'NombreAplicacion', 2: 'LemaPrincipal', 3: 'DescripcionBreve',
  4: 'MensajeComercial', 5: 'CtaPrincipal', 6: 'CtaAlternativa',
  10: 'TerminoCliente', 11: 'TerminoRecurso', 12: 'TerminoServicio',
  13: 'TerminoCita', 14: 'TerminoHistorial', 15: 'TerminoDisponibilidad',
  20: 'AccionNuevaAsignacion', 21: 'AccionVerDisponibilidad', 22: 'AccionBuscarCliente',
  23: 'AccionGestionarRecursos', 24: 'AccionGestionarServicios',
  30: 'PantallaOperacionHoy', 31: 'PantallaCalendario', 32: 'PantallaDisponibilidad',
  33: 'PantallaCatalogoServicios', 34: 'PantallaClientes', 35: 'PantallaRecursos',
  40: 'MsgSeleccionarRecursos', 41: 'MsgSeleccionarReserva', 42: 'MsgProximaDisponibilidad',
  43: 'MsgSinDatos', 44: 'MsgCargando', 45: 'AgendaSub', 46: 'LabelProfesionales',
  47: 'MsgSeleccionarProfesional', 48: 'NuevaCitaSub',
}

// Runtime array of ClaveTermino keys (since ClaveTermino is a TS type, not a runtime enum)
const CLAVE_TERMINO_KEYS: ClaveTermino[] = [
  'NombreAplicacion', 'LemaPrincipal', 'DescripcionBreve', 'MensajeComercial', 'CtaPrincipal', 'CtaAlternativa',
  'TerminoCliente', 'TerminoRecurso', 'TerminoServicio', 'TerminoCita', 'TerminoHistorial', 'TerminoDisponibilidad',
  'AccionNuevaAsignacion', 'AccionVerDisponibilidad', 'AccionBuscarCliente', 'AccionGestionarRecursos', 'AccionGestionarServicios',
  'PantallaOperacionHoy', 'PantallaCalendario', 'PantallaDisponibilidad', 'PantallaCatalogoServicios', 'PantallaClientes', 'PantallaRecursos',
  'MsgSeleccionarRecursos', 'MsgSeleccionarReserva', 'MsgProximaDisponibilidad', 'MsgSinDatos', 'MsgCargando',
  'NotifAsuntoNuevaCita', 'NotifCuerpoNuevaCita', 'NotifAsuntoRecordatorio', 'NotifCuerpoRecordatorio', 'NotifAsuntoCancelacion', 'NotifCuerpoCancelacion', 'NotifAsuntoReprogramacion', 'NotifCuerpoReprogramacion',
  'TeamsAsuntoEvento', 'TeamsCuerpoEvento', 'TeamsUbicacion',
  'PdfTituloReporteCitas', 'PdfTituloHistorial', 'PdfColumnaCliente', 'PdfColumnaRecurso', 'PdfColumnaServicio', 'PdfColumnaFechaHora', 'PdfColumnaEstado',
]

const inputCls =
  'mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'

// Helper components
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

function VistaPreviaTermino({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <p className="text-[11px] text-foreground/50 uppercase tracking-wide">{etiqueta}</p>
      <p className="mt-1 text-sm font-medium truncate">{valor}</p>
    </div>
  )
}

function Spinner({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-5 py-4 text-sm text-foreground/70" role="status">
      <svg className="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span>{texto}</span>
    </div>
  )
}

type Vertical = 'default' | 'salud' | 'belleza' | 'servicios' | 'taller'

const VISTA_PREVIA_CLAVES = [
  'NombreAplicacion', 'TerminoCliente', 'TerminoRecurso', 'TerminoServicio',
  'TerminoCita', 'TerminoDisponibilidad', 'AccionNuevaAsignacion', 'PantallaOperacionHoy',
] as const

const VISTA_PREVIA_ETIQUETAS: Record<string, string> = {
  NombreAplicacion: 'Nombre App',
  TerminoCliente: 'Cliente',
  TerminoRecurso: 'Recurso/Equipo',
  TerminoServicio: 'Servicio',
  TerminoCita: 'Cita/Reserva',
  TerminoDisponibilidad: 'Disponibilidad',
  AccionNuevaAsignacion: 'Nueva asignación',
  PantallaOperacionHoy: 'Pantalla principal',
}

export function IdentidadView() {
  const { t, recargar, vertical: verticalActiva, setVertical: setVerticalContext } = useCatalogo()
  const [vertical, setVertical] = useState<Vertical>('default')
  const [sembrando, setSembrando] = useState(false)
  const [seedExito, setSeedExito] = useState<string | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false)
  const [previewTerminos, setPreviewTerminos] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    setVertical(verticalActiva as Vertical)
  }, [verticalActiva])

  // Cargar vista previa cuando cambia la vertical seleccionada
  useEffect(() => {
    if (vertical === verticalActiva) {
      setPreviewTerminos(null)
      return
    }
    api.catalogoTerminos(1, vertical)
      .then((data) => {
        const mapa: Record<string, string> = {}
        for (const item of data) {
          if (item.activo) {
            const claveStr = typeof item.clave === 'number'
              ? NUM_A_CLAVE[item.clave]
              : String(item.clave)
            if (claveStr) mapa[claveStr] = item.valor
          }
        }
        setPreviewTerminos(mapa)
      })
      .catch(() => setPreviewTerminos(null))
  }, [vertical, verticalActiva])

  const handleComboChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVertical(e.target.value as typeof vertical)
  }

  const aplicarVertical = async () => {
    setSembrando(true)
    setSeedExito(null)
    setSeedError(null)
    try {
      const res = await api.seedCatalogo(1, { vertical })
      setSeedExito(`Vertical "${vertical}" sembrada: ${res.terminosCreados} términos creados/actualizados.`)
      setVerticalContext(vertical)
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : 'Error sembrando vertical')
    } finally {
      setSembrando(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <Cabecera
        titulo="Identidad de Aplicación"
        sub="Cambie la vertical de negocio para adaptar todos los términos de la interfaz. También puede gestionar el catálogo de términos completo."
      />

      <Seccion titulo="Vertical de negocio">
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Identidad actual
            <div className="mt-1 flex items-center gap-3">
              <select
                value={vertical}
                onChange={handleComboChange}
                className={inputCls}
              >
                <option value="default">Default (Genérico - MASTER.md)</option>
                <option value="salud">Salud (Médicos/Pacientes/Citas médicas)</option>
                <option value="belleza">Belleza (Estilistas/Clientes/Turnos)</option>
                <option value="servicios">Servicios Profesionales (Consultores/Clientes/Reuniones)</option>
                <option value="taller">Taller/Soporte (Técnicos/Clientes/Órdenes)</option>
              </select>
              <button
                type="button"
                onClick={aplicarVertical}
                disabled={sembrando || vertical === verticalActiva}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {sembrando ? 'Sembrando…' : 'Aplicar y sembrar catálogo'}
              </button>
            </div>
            <p className="mt-1 text-xs text-foreground/50">
              Vertical activa: <strong>{verticalActiva}</strong> · Al confirmar, se recarga el catálogo de términos del tenant activo (tenantId=1).
            </p>
          </label>

          {seedExito && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {seedExito}
            </div>
          )}
          {seedError && (
            <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {seedError}
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <h4 className="text-sm font-medium mb-2">
              Términos clave (vista previa)
              {vertical !== verticalActiva && (
                <span className="ml-2 text-xs font-normal text-foreground/50">
                  — Preview de "{vertical}"
                </span>
              )}
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {VISTA_PREVIA_CLAVES.map((clave) => (
                <VistaPreviaTermino
                  key={clave}
                  etiqueta={VISTA_PREVIA_ETIQUETAS[clave]}
                  valor={previewTerminos?.[clave] ?? t(clave)}
                />
              ))}
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Gestión avanzada">
        <div className="space-y-3">
          <p className="text-sm text-foreground/60">
            Para editar, crear o inactivar términos individuales, use el catálogo de términos completo.
            <br />
            <span className="text-xs text-foreground/50">
              (En el futuro, esto requerirá permiso de administración multitenant)
            </span>
          </p>
          <button
            type="button"
            onClick={() => setMostrarCatalogo(true)}
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
          >
            Abrir catálogo de términos completo →
          </button>
        </div>
      </Seccion>

      {mostrarCatalogo && (
        <CatalogoTerminosModal
          vertical={verticalActiva as Vertical}
          onCerrar={() => setMostrarCatalogo(false)}
          onRecargar={recargar}
        />
      )}
    </div>
  )
}

function CatalogoTerminosModal({
  vertical,
  onCerrar,
  onRecargar,
}: {
  vertical: 'default' | 'salud' | 'belleza' | 'servicios' | 'taller'
  onCerrar: () => void
  onRecargar: () => Promise<void>
}) {
  const [terminos, setTerminos] = useState<CatalogoTerminoDto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [modo, setModo] = useState<'crear' | 'editar' | null>(null)
  const [editando, setEditando] = useState<CatalogoTerminoDto | null>(null)
  const [formClave, setFormClave] = useState<ClaveTermino>('NombreAplicacion')
  const [formValor, setFormValor] = useState('')
  const [formCategoria, setFormCategoria] = useState('Identidad')
  const [guardando, setGuardando] = useState(false)

  const categorias = [
    'Identidad', 'Entidades', 'Acciones', 'Pantallas', 'Mensajes',
    'Notificaciones', 'Teams', 'PDFs'
  ] as const

  useEffect(() => {
    api.catalogoTerminos(1, vertical).then(setTerminos).catch((e) => setError(e.message)).finally(() => setCargando(false))
  }, [vertical])

  const terminosFiltrados = filtroCategoria
    ? terminos.filter((t) => t.categoria === filtroCategoria)
    : terminos

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      if (modo === 'crear') {
        await api.crearTermino(1, { clave: formClave, valor: formValor, categoria: formCategoria, vertical })
      } else if (modo === 'editar' && editando) {
        await api.actualizarTermino(1, editando.clave, vertical, { valor: formValor, categoria: formCategoria })
      }
      setModo(null)
      setEditando(null)
      setFormValor('')
      const actualizados = await api.catalogoTerminos(1, vertical)
      setTerminos(actualizados)
      await onRecargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando')
    } finally {
      setGuardando(false)
    }
  }

  async function inactivar(t: CatalogoTerminoDto) {
    if (!confirm(`¿Inactivar "${t.clave}"?`)) return
    try {
      await api.inactivarTermino(1, t.clave, vertical)
      const actualizados = await api.catalogoTerminos(1, vertical)
      setTerminos(actualizados)
      await onRecargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inactivando')
    }
  }

  // Render the modal content as a separate function to avoid JSX parsing issues
  function renderModalContent() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Catálogo de términos"
          className="w-full max-w-4xl max-h-[85vh] rounded-xl border border-border bg-white overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <p className="text-base font-semibold">Catálogo de términos (tenant 1)</p>
            <button type="button" onClick={onCerrar} className="rounded-md px-3 py-1.5 text-sm text-foreground/70 hover:bg-muted">Cerrar</button>
          </div>

          {error && (
            <div className="border-b border-rose-300 bg-rose-50 px-5 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
            <label className="flex items-center gap-2 text-sm">
              Categoría:
              <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={inputCls}>
                <option value="">Todas</option>
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={() => { setModo('crear'); setEditando(null); setFormClave('NombreAplicacion'); setFormValor(''); setFormCategoria('Identidad'); }}
              className="ml-auto rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Nuevo término
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5">
            {cargando ? (
              <Spinner texto="Cargando términos…" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
                      <th className="px-4 py-3">Clave</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terminosFiltrados.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-foreground/50" colSpan={5}>
                          No hay términos para mostrar.
                        </td>
                      </tr>
                    ) : (
                      terminosFiltrados.map((term) => (
                        <tr key={term.id} className="border-t border-border first:border-t-0 hover:bg-muted/40">
                          <td className="px-4 py-3 font-mono text-xs">{term.clave}</td>
                          <td className="px-4 py-3 truncate max-w-xs">{term.valor}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{term.categoria}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${term.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {term.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => { setModo('editar'); setEditando(term); setFormClave(term.clave); setFormValor(term.valor); setFormCategoria(term.categoria); }}
                                className="rounded px-2 py-1 text-[11px] text-foreground/70 hover:bg-muted"
                                title="Editar"
                              >
                                ✎
                              </button>
                              {term.activo && (
                                <button
                                  type="button"
                                  onClick={() => inactivar(term)}
                                  className="rounded px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50"
                                  title="Inactivar"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {(modo === 'crear' || modo === 'editar') && (
            <div className="border-t border-border p-5 bg-muted/30">
              <h4 className="mb-3 font-medium">{modo === 'crear' ? 'Crear término' : 'Editar término'}</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm font-medium">
                  Clave
                  <select value={formClave} onChange={(e) => setFormClave(e.target.value as ClaveTermino)} className={inputCls} disabled={modo === 'editar'}>
                    {CLAVE_TERMINO_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  Valor
                  <input value={formValor} onChange={(e) => setFormValor(e.target.value)} className={inputCls} placeholder="Valor del término" />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  Categoría
                  <select value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)} className={inputCls}>
                    {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => { setModo(null); setEditando(null); }} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-muted">Cancelar</button>
                <button type="button" onClick={guardar} disabled={guardando || !formValor.trim()} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return createPortal(renderModalContent(), document.body)
}