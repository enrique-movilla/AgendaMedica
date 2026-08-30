import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useCatalogo } from '../context/CatalogoContext'
import { hoyISO, msgError } from '../lib/helpers'
import { inputCls, DIAS_SEMANA } from '../lib/constants'
import { Cabecera, Seccion, Aviso, Exito, Spinner } from '../components/shared'
import type {
  ActualizarDisponibilidadRequest,
  BloqueoAgendaDto,
  CrearBloqueoAgendaRequest,
  CrearExcepcionHorariaRequest,
  DisponibilidadProfesionalDto,
  ExcepcionHorariaDto,
  ProfesionalResumenDto,
  SedeDto,
} from '../lib/types'

export function DisponibilidadView({
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
  const { t, tf } = useCatalogo()
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
  const [sedes, setSedes] = useState<SedeDto[]>([])

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
    api.sedes().then(setSedes).catch(() => {})
  }, [])

  useEffect(() => {
    if (!profId && profesionales.length > 0) {
      setProfId(profesionalInicial?.id ?? profesionales[0].id)
      return
    }
    recargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profId, profesionales, profesionalInicial])

  async function inactivar(p: DisponibilidadProfesionalDto) {
    if (!confirm(tf('ConfirmInactivarHorario', { dia: p.nombreDia, inicio: p.horaInicio, fin: p.horaFin }))) {
      return
    }
    try {
      await api.inactivarDisponibilidad(p.id)
      setExito(tf('ExitoHorarioInactivado', { dia: p.nombreDia }))
      recargar()
    } catch (e) {
      setError(msgError(e))
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <Cabecera
          titulo={t('TerminoDisponibilidad')}
          sub={t('DispSub')}
        />
        {showVolver && (
          <button
            type="button"
            onClick={onVolver}
            className="mt-1 shrink-0 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted"
          >
            {t('BtnVolverProfesionales')}
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
          {t('LabelProfesional')}
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
            {t('BtnNuevaPlantilla')}
          </button>
        </div>
      </div>

      {modo && profId > 0 && (
        <FormDisponibilidad
          key={`${modo}-${editarPlantilla?.id ?? 'nuevo'}`}
          plantilla={editarPlantilla}
          sedes={sedes}
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
                setExito(t('ExitoPlantillaCreada'))
              } else if (editarPlantilla) {
                await api.actualizarDisponibilidad(editarPlantilla.id, payload)
                setExito(t('ExitoPlantillaActualizada'))
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
            ? t('MsgSinHorarios')
            : t('MsgSeleccionarProfHorarios')}
        </div>
      )}

      {!cargando && plantillas && plantillas.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
                  <th className="px-4 py-3">{t('ColDia')}</th>
                  <th className="px-4 py-3">{t('LabelDesde')}</th>
                  <th className="px-4 py-3">{t('LabelHasta')}</th>
                  <th className="px-4 py-3">{t('ColDuracionTurno')}</th>
                  <th className="px-4 py-3">{t('ColSede')}</th>
                  <th className="px-4 py-3">{t('ColConsultorio')}</th>
                  <th className="px-4 py-3">{t('LabelAcciones')}</th>
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
                    <td className="px-4 py-3">{p.duracionMinutos} {t('TxtMin')}</td>
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
                        {t('BtnEditar')}
                      </button>
                      <button
                        type="button"
                        onClick={() => inactivar(p)}
                        className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                      >
                        {t('BtnInactivar')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3 text-sm text-foreground/60">
            {plantillas.length} {plantillas.length !== 1 ? t('TxtPlantillaPlural') : t('TxtPlantillaSingular')}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{t('TitBloqueosAgenda')}</h2>
          <button
            type="button"
            disabled={modoBloqueo || !profId}
            onClick={() => setModoBloqueo(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('BtnNuevoBloqueo')}
          </button>
        </div>
        <p className="mb-4 text-sm text-foreground/60">
          {t('DispDescBloqueos')}
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
                setExito(t('ExitoBloqueoCreado'))
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
            {t('MsgSinBloqueos')}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
                    <th className="px-4 py-3">{t('LabelDesde')}</th>
                    <th className="px-4 py-3">{t('LabelHasta')}</th>
                    <th className="px-4 py-3">{t('ColFranja')}</th>
                    <th className="px-4 py-3">{t('LabelMotivo')}</th>
                    <th className="px-4 py-3">{t('LabelAcciones')}</th>
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
                          : t('TxtDiaCompleto')}
                      </td>
                      <td className="px-4 py-3">{b.motivo}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !confirm(
                                tf('ConfirmInactivarBloqueo', { motivo: b.motivo, desde: b.fechaDesde, hasta: b.fechaHasta }),
                              )
                            )
                              return
                            try {
                              await api.inactivarBloqueoAgenda(b.id)
                              setExito(t('ExitoBloqueoInactivado'))
                              recargar()
                            } catch (e) {
                              setError(msgError(e))
                            }
                          }}
                          className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                        >
                          {t('BtnInactivar')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3 text-sm text-foreground/60">
              {bloqueos.length} {bloqueos.length !== 1 ? t('TxtBloqueoPlural') : t('TxtBloqueoSingular')}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{t('TitExcepcionesHorarias')}</h2>
          <button
            type="button"
            disabled={modoExcepcion || !profId}
            onClick={() => setModoExcepcion(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('BtnNuevaExcepcion')}
          </button>
        </div>
        <p className="mb-4 text-sm text-foreground/60">
          {t('DispDescExcepciones')}
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
                setExito(t('ExitoExcepcionCreada'))
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
            {t('MsgSinExcepciones')}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
                    <th className="px-4 py-3">{t('LabelFecha')}</th>
                    <th className="px-4 py-3">{t('LabelDesde')}</th>
                    <th className="px-4 py-3">{t('LabelHasta')}</th>
                    <th className="px-4 py-3">{t('LabelAcciones')}</th>
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
                            if (!confirm(tf('ConfirmInactivarExcepcion', { fecha: x.fecha }))) return
                            try {
                              await api.inactivarExcepcionHoraria(x.id)
                              setExito(t('ExitoExcepcionInactivada'))
                              recargar()
                            } catch (e) {
                              setError(msgError(e))
                            }
                          }}
                          className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                        >
                          {t('BtnInactivar')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3 text-sm text-foreground/60">
              {excepciones.length} {excepciones.length !== 1 ? t('TxtExcepcionPlural') : t('TxtExcepcionSingular')}
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
  const { t } = useCatalogo()
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
      e.push(t('ValHorasRequeridas'))
    } else if (hFin <= hInicio) {
      e.push(t('ValHoraFinPosterior'))
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
    <Seccion titulo={esEdicion ? t('TitEditarHorario') : t('TitNuevoHorario')}>
      {errors.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-medium" htmlFor="disp-dia">
          {t('LabelDiaSemana')}
          <select
            id="disp-dia"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className={inputCls}
          >
            {DIAS_SEMANA.map((d) => (
              <option key={d.id} value={d.id}>
                {t(d.clave)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="disp-inicio">
          {t('LabelHoraInicio')}
          <input
            id="disp-inicio"
            type="time"
            value={hInicio}
            onChange={(e) => setHInicio(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="disp-fin">
          {t('LabelHoraFin')}
          <input
            id="disp-fin"
            type="time"
            value={hFin}
            onChange={(e) => setHFin(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="disp-duracion">
          {t('ColDuracionTurno')}
          <select
            id="disp-duracion"
            value={dur}
            onChange={(e) => setDur(e.target.value)}
            className={inputCls}
          >
            {[15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} {t('TxtMinutos')}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="disp-sede">
          {t('LabelSede')}
          <select
            id="disp-sede"
            value={sede}
            onChange={(e) => setSede(e.target.value)}
            className={inputCls}
          >
            <option value="">{t('TxtSinSede')}</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="disp-consultorio">
          {t('LabelConsultorioSala')}
          <input
            id="disp-consultorio"
            type="text"
            value={consultorio}
            onChange={(e) => setConsultorio(e.target.value)}
            placeholder={t('PlaceholderConsultorio')}
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
          {guardando ? t('MsgGuardando') : esEdicion ? t('BtnGuardarCambios') : t('BtnGuardarPlantilla')}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
        >
          {t('BtnCancelar')}
        </button>
      </div>
    </Seccion>
  )
}

function FormBloqueo({
  guardando,
  onCancelar,
  onGuardar,
}: {
  guardando: boolean
  onCancelar: () => void
  onGuardar: (payload: Omit<CrearBloqueoAgendaRequest, 'profesionalId'>) => Promise<void>
}) {
  const { t } = useCatalogo()
  const [motivo, setMotivo] = useState('')
  const [fechaDesde, setFechaDesde] = useState(hoyISO())
  const [fechaHasta, setFechaHasta] = useState(hoyISO())
  const [franja, setFranja] = useState(false)
  const [hInicio, setHInicio] = useState('13:00')
  const [hFin, setHFin] = useState('14:00')
  const [errors, setErrors] = useState<string[]>([])

  function validarYEnviar() {
    const e: string[] = []
    if (!motivo.trim()) e.push(t('ValMotivoRequerido'))
    if (!fechaDesde || !fechaHasta) {
      e.push(t('ValFechasRequeridas'))
    } else if (fechaHasta < fechaDesde) {
      e.push(t('ValFechaFinAnterior'))
    }
    if (franja) {
      if (!hInicio || !hFin) {
        e.push(t('ValHorasFranjaRequeridas'))
      } else if (hFin <= hInicio) {
        e.push(t('ValHoraFinPosterior'))
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
    <Seccion titulo={t('TitNuevoBloqueoAgenda')}>
      {errors.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-medium" htmlFor="blq-motivo">
          {t('LabelMotivo')}
          <input
            id="blq-motivo"
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={t('PhMotivoBloqueo')}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="blq-desde">
          {t('LabelFechaDesde')}
          <input
            id="blq-desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="blq-hasta">
          {t('LabelFechaHasta')}
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
          {t('ChkBloquearFranja')}
        </label>
        {franja && (
          <>
            <label className="block text-sm font-medium" htmlFor="blq-hinicio">
              {t('LabelHoraInicio')}
              <input
                id="blq-hinicio"
                type="time"
                value={hInicio}
                onChange={(e) => setHInicio(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block text-sm font-medium" htmlFor="blq-hfin">
              {t('LabelHoraFin')}
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
          {guardando ? t('MsgGuardando') : t('BtnGuardarBloqueo')}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
        >
          {t('BtnCancelar')}
        </button>
      </div>
    </Seccion>
  )
}

function FormExcepcion({
  guardando,
  onCancelar,
  onGuardar,
}: {
  guardando: boolean
  onCancelar: () => void
  onGuardar: (payload: Omit<CrearExcepcionHorariaRequest, 'profesionalId'>) => Promise<void>
}) {
  const { t } = useCatalogo()
  const [fecha, setFecha] = useState(hoyISO())
  const [hInicio, setHInicio] = useState('08:00')
  const [hFin, setHFin] = useState('12:00')
  const [errors, setErrors] = useState<string[]>([])

  function validarYEnviar() {
    const e: string[] = []
    if (!fecha) e.push(t('ValFechaRequerida'))
    if (!hInicio || !hFin) {
      e.push(t('ValHorasRequeridas'))
    } else if (hFin <= hInicio) {
      e.push(t('ValHoraFinPosterior'))
    }
    setErrors(e)
    if (e.length > 0) return

    onGuardar({ fecha, horaInicio: hInicio, horaFin: hFin })
  }

  return (
    <Seccion titulo={t('TitNuevaExcepcionHoraria')}>
      {errors.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-medium" htmlFor="exc-fecha">
          {t('LabelFecha')}
          <input
            id="exc-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="exc-inicio">
          {t('LabelHoraInicio')}
          <input
            id="exc-inicio"
            type="time"
            value={hInicio}
            onChange={(e) => setHInicio(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="exc-fin">
          {t('LabelHoraFin')}
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
          {guardando ? t('MsgGuardando') : t('BtnGuardarExcepcion')}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
        >
          {t('BtnCancelar')}
        </button>
      </div>
    </Seccion>
  )
}
