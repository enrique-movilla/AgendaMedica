import { useState } from 'react'
import { api } from './lib/api'
import { PERFILES, leerPerfilActivo, guardarPerfilActivo, type PerfilId } from './lib/perfil'
import VentanaConfigBusqueda from './components/VentanaConfigBusqueda'
import { useCatalogo } from './context/CatalogoContext'
import { AgendaView } from './views/AgendaView'
import type { CitaHint } from './views/AgendaView'
import { NuevaCitaView } from './views/NuevaCitaView'
import { PacientesView } from './views/PacientesView'
import { ProfesionalesView } from './views/ProfesionalesView'
import { DisponibilidadView } from './views/DisponibilidadView'
import { CatalogosView } from './views/CatalogosView'
import { IdentidadView } from './components/IdentidadView'
import type { ProfesionalResumenDto } from './lib/types'

type Vista = 'agenda' | 'nueva-cita' | 'pacientes' | 'profesionales' | 'disponibilidad' | 'catalogos' | 'identidad'

const NAV: { id: Vista; clave: string }[] = [
  { id: 'agenda',         clave: 'PantallaOperacionHoy' },
  { id: 'nueva-cita',     clave: 'AccionNuevaAsignacion' },
  { id: 'pacientes',      clave: 'PantallaClientes' },
  { id: 'profesionales',  clave: 'PantallaRecursos' },
  { id: 'disponibilidad', clave: 'PantallaDisponibilidad' },
  { id: 'catalogos',      clave: 'PantallaCatalogoServicios' },
]

export default function App() {
  const { t } = useCatalogo()
  const [vista, setVista] = useState<Vista>('agenda')
  // Perfil simulado del MVP (mismos permisos; solo cambia el ambiente).
  const [perfil, setPerfil] = useState<PerfilId>(() => leerPerfilActivo())
  const [configAbierta, setConfigAbierta] = useState(false)
  const [citaHint, setCitaHint] = useState<CitaHint | null>(null)
  const [agendaEnfoque, setAgendaEnfoque] = useState<{
    fecha: string
    profesionalesIds: number[]
  } | null>(null)
  const [profesionales, setProfesionales] = useState<ProfesionalResumenDto[]>([])

  // Cargar profesionales para DisponibilidadView
  useState(() => {
    api.profesionales().then(setProfesionales).catch(() => {})
  })

  function navegar(v: Vista) {
    if (v !== 'nueva-cita' && citaHint?.bloqueoId) {
      void api.liberarBloqueo(citaHint.bloqueoId).catch(() => {})
    }
    setVista(v)
  }

  /** Cambia de operador simulado y persiste cuál está activo. */
  function cambiarPerfil(p: PerfilId) {
    if (p === perfil) return
    guardarPerfilActivo(p)
    setPerfil(p)
  }

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

  function finalizarNuevaCita(cita: { fechaHora: string; profesional: { id: number } }) {
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
              <p className="text-sm font-bold leading-tight">{t('NombreAplicacion')}</p>
              <p className="text-xs text-foreground/60">{t('LemaPrincipal')}</p>
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
                {t(n.clave as any)}
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
            <button
              type="button"
              onClick={() => navegar('identidad')}
              className="mt-2 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
            >
              Identidad de Aplicación
            </button>

            {/* Perfiles simulados del MVP (mismos permisos) */}
            <p className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
              Perfil (simulación)
            </p>
            {PERFILES.map((p) => {
              const activo = perfil === p.id
              const esU1 = p.id === 'u1'
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => cambiarPerfil(p.id)}
                  aria-pressed={activo}
                  title={activo ? `${p.nombre} (activo)` : `Cambiar a ${p.nombre}`}
                  className={`mt-1 flex w-full items-center gap-2 rounded-lg border-l-4 px-3 py-2 text-left text-sm font-medium transition-colors ${
                    activo
                      ? esU1
                        ? 'border-sky-500 bg-sky-50 text-sky-900'
                        : 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-transparent text-foreground/80 hover:bg-muted'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      activo ? (esU1 ? 'bg-sky-500' : 'bg-emerald-500') : 'bg-foreground/20'
                    }`}
                  />
                  {p.nombre}
                  {activo && <span className="ml-auto text-[11px] font-semibold">● activo</span>}
                </button>
              )
            })}
          </div>
        </aside>

        <main className="flex-1 px-6 py-6 sm:px-8">
          {vista === 'agenda' && (
            <AgendaView
              key={perfil}
              perfil={perfil}
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
          {vista === 'profesionales' && (
            <ProfesionalesView
              onHorario={() => {
                setAgendaEnfoque(null)
                setVista('disponibilidad')
              }}
            />
          )}
          {vista === 'disponibilidad' && (
            <DisponibilidadView
              profesionales={profesionales}
              profesionalInicial={profesionales[0] ?? null}
              onVolver={() => setVista('profesionales')}
              showVolver={false}
            />
          )}
          {vista === 'catalogos' && <CatalogosView />}
          {vista === 'identidad' && <IdentidadView />}
        </main>
      </div>

      <VentanaConfigBusqueda abierta={configAbierta} onCerrar={() => setConfigAbierta(false)} />
    </div>
  )
}
