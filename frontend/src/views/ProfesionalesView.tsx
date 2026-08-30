import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useCatalogo } from '../context/CatalogoContext'
import { msgError } from '../lib/helpers'
import { inputCls } from '../lib/constants'
import { Cabecera, Aviso, Exito, Seccion, Spinner } from '../components/shared'
import type {
  CrearProfesionalRequest,
  EspecialidadDto,
  ProfesionalResumenDto,
  SedeDto,
  TipoIdentificacionDto,
} from '../lib/types'

type ModoFormProfesional = 'crear' | 'editar' | null

export function ProfesionalesView({
  onHorario,
}: {
  onHorario: (profesional: ProfesionalResumenDto) => void
}) {
  const { t, tf } = useCatalogo()
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

  const [especialidades, setEspecialidades] = useState<EspecialidadDto[]>([])
  const [sedes, setSedes] = useState<SedeDto[]>([])
  const [tiposId, setTiposId] = useState<TipoIdentificacionDto[]>([])

  useEffect(() => {
    Promise.all([
      api.especialidades(),
      api.sedes(),
      api.tiposIdentificacion(),
    ])
      .then(([es, se, ti]) => {
        setEspecialidades(es)
        setSedes(se)
        setTiposId(ti)
      })
      .catch(() => {})
  }, [])

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
      !confirm(tf('MsgConfirmarInactivar', { nombre: p.nombresCompletos }))
    ) {
      return
    }
    try {
      await api.inactivarProfesional(p.id)
      setExito(tf('MsgProfesionalInactivado', { nombre: p.nombresCompletos }))
      recargar()
    } catch (e) {
      setError(msgError(e))
    }
  }

  return (
    <div>
      <Cabecera
        titulo={t('LabelProfesionales')}
        sub={t('ProfesionalesSub')}
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
            {t('LabelNombre')}
            <input
              id="pf-termino"
              type="search"
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              placeholder={t('PlaceholderBuscarNombre')}
              className={inputCls}
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="pf-especialidad">
            {t('LabelEspecialidad')}
            <select
              id="pf-especialidad"
              value={filtroEspecialidad}
              onChange={(e) => setFiltroEspecialidad(e.target.value)}
              className={inputCls}
            >
              <option value="">{t('LabelTodas')}</option>
              {especialidades.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium" htmlFor="pf-sede">
            {t('LabelSede')}
            <select
              id="pf-sede"
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
              className={inputCls}
            >
              <option value="">{t('LabelTodas')}</option>
              {sedes.map((s) => (
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
            {t('LabelSoloActivos')}
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModo('crear')}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            {t('BtnNuevoProfesional')}
          </button>
        </div>
      </div>

      {(modo === 'crear' || modo === 'editar') && (
        <FormProfesional
          tiposId={tiposId}
          especialidades={especialidades}
          sedes={sedes}
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
                setExito(t('MsgProfesionalCreado'))
              } else if (editarProfesional) {
                await api.actualizarProfesional(editarProfesional.id, payload)
                setExito(t('MsgProfesionalActualizado'))
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
          {t('MsgSinProfesionales')}
        </div>
      )}

      {!cargando && items && filtrados.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
                  <th className="px-4 py-3">{t('ColIdentificacion')}</th>
                  <th className="px-4 py-3">{t('ColNumero')}</th>
                  <th className="px-4 py-3">{t('ColNombresCompletos')}</th>
                  <th className="px-4 py-3">{t('LabelEspecialidad')}</th>
                  <th className="px-4 py-3">{t('LabelSede')}</th>
                  <th className="px-4 py-3">{t('ColConsultorio')}</th>
                  <th className="px-4 py-3">{t('ColRegistroMedico')}</th>
                  <th className="px-4 py-3">{t('ColContacto')}</th>
                  <th className="px-4 py-3">{t('ColEstado')}</th>
                  <th className="px-4 py-3">{t('ColAcciones')}</th>
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
                        {p.activo ? t('EstadoActivo') : t('EstadoInactivo')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        disabled={modo !== null}
                        onClick={() => onHorario(p)}
                        className="mr-2 rounded-md border border-primary px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                      >
                        {t('BtnHorario')}
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
                        {t('BtnEditar')}
                      </button>
                      {p.activo && (
                        <button
                          type="button"
                          onClick={() => inactivar(p)}
                          className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                        >
                          {t('BtnInactivar')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3 text-sm text-foreground/60">
            {filtrados.length} {t('MsgConteoProfesionales')}{filtrados.length !== 1 ? 'es' : ''}
          </div>
        </div>
      )}
    </div>
  )
}

function FormProfesional({
  tiposId,
  especialidades,
  sedes,
  profesional,
  guardando,
  onCancelar,
  onGuardar,
}: {
  tiposId: TipoIdentificacionDto[]
  especialidades: EspecialidadDto[]
  sedes: SedeDto[]
  profesional: ProfesionalResumenDto | null
  guardando: boolean
  onCancelar: () => void
  onGuardar: (payload: CrearProfesionalRequest) => Promise<void>
}) {
  const { t } = useCatalogo()
  const esEdicion = profesional !== null
  const [tipoDoc, setTipoDoc] = useState(
    String(
      tiposId.find((ti) => ti.nombre === profesional?.tipoIdentificacion)?.id ??
        tiposId[0]?.id ??
        1,
    ),
  )
  const [numDoc, setNumDoc] = useState(profesional?.numeroIdentificacion ?? '')
  const [nombres, setNombres] = useState(profesional?.nombresCompletos ?? '')
  const [especialidadId, setEspecialidadId] = useState(
    String(profesional?.especialidadId ?? especialidades[0]?.id ?? ''),
  )
  const [sedeId, setSedeId] = useState(
    String(profesional?.sedeId ?? sedes[0]?.id ?? ''),
  )
  const [celular, setCelular] = useState(profesional?.celular ?? '')
  const [email, setEmail] = useState(profesional?.email ?? '')
  const [consultorio, setConsultorio] = useState(profesional?.consultorioSala ?? '')
  const [registro, setRegistro] = useState(profesional?.registroMedico ?? '')
  const [errors, setErrors] = useState<string[]>([])

  function validarYEnviar() {
    const e: string[] = []
    if (!nombres.trim()) e.push(t('ValidacionNombresObligatorios'))
    if (!especialidadId) e.push(t('ValEspecialidadRequerida'))
    if (!sedeId) e.push(t('ValSedeRequerida'))
    if (!esEdicion && !numDoc.trim())
      e.push(t('ValidacionDocumentoObligatorio'))
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
    <Seccion titulo={esEdicion ? t('TituloEditarProfesional') : t('TituloNuevoProfesional')}>
      {errors.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor="pf-tipo-doc">
          {t('LabelTipoIdentificacion')}
          <select
            id="pf-tipo-doc"
            value={tipoDoc}
            onChange={(e) => setTipoDoc(e.target.value)}
            disabled={esEdicion}
            className={inputCls}
          >
            {tiposId.map((ti) => (
              <option key={ti.id} value={ti.id}>
                {ti.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="pf-documento">
          {t('LabelNumeroIdentificacion')}
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
            {t('ColNombresCompletos')}
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
          {t('LabelEspecialidad')}
          <select
            id="pf-especialidad"
            value={especialidadId}
            onChange={(e) => setEspecialidadId(e.target.value)}
            className={inputCls}
          >
            {especialidades.map((es) => (
              <option key={es.id} value={es.id}>
                {es.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="pf-sede">
          {t('LabelSede')}
          <select
            id="pf-sede"
            value={sedeId}
            onChange={(e) => setSedeId(e.target.value)}
            className={inputCls}
          >
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="pf-consultorio">
          {t('LabelConsultorioSala')}
          <input
            id="pf-consultorio"
            type="text"
            value={consultorio}
            onChange={(e) => setConsultorio(e.target.value)}
            placeholder={t('PlaceholderConsultorio')}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="pf-registro">
          {t('ColRegistroMedico')}
          <input
            id="pf-registro"
            type="text"
            value={registro}
            onChange={(e) => setRegistro(e.target.value)}
            placeholder={t('PlaceholderTarjetaProfesional')}
            className={inputCls}
          />
        </label>
      </div>

      <h3 className="mb-3 mt-6 border-t border-border pt-4 text-sm font-semibold">{t('ColContacto')}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor="pf-celular">
          {t('LabelCelular')}
          <input
            id="pf-celular"
            type="tel"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="pf-email">
          {t('LabelCorreoElectronico')}
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
          {guardando ? t('MsgGuardando') : esEdicion ? t('BtnGuardarCambios') : t('BtnRegistrarProfesional')}
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
