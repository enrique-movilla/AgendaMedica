import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useCatalogo } from '../context/CatalogoContext'
import { useConfigBusqueda } from '../lib/configBusqueda'
import { formatFecha, msgError } from '../lib/helpers'
import { inputCls } from '../lib/constants'
import { Cabecera, Seccion, Aviso, Exito, Spinner } from '../components/shared'
import BuscadorAseguradora from '../components/BuscadorAseguradora'
import type { PacienteDto, PacienteListaDto, TipoIdentificacionDto, TipoUsuarioDto } from '../lib/types'

type ModoFormPaciente = 'crear' | 'editar' | null

export function PacientesView() {
  const { t } = useCatalogo()
  const configBusqueda = useConfigBusqueda()
  const [datos, setDatos] = useState<PacienteListaDto | null>(null)
  const [tiposId, setTiposId] = useState<TipoIdentificacionDto[]>([])
  const [tiposUsuario, setTiposUsuario] = useState<TipoUsuarioDto[]>([])
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

  useEffect(() => {
    Promise.all([api.tiposIdentificacion(), api.tiposUsuario()])
      .then(([ti, tu]) => {
        setTiposId(ti)
        setTiposUsuario(tu)
      })
      .catch(() => {})
  }, [])

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
      setError(t('MsgMinimoNombre').replace('{minimo}', String(minNombre)))
      return
    }
    if (numDoc.trim() && numDoc.trim().length < minDoc && minDoc > 0) {
      setError(t('MsgMinimoDocumento').replace('{minimo}', String(minDoc)))
      return
    }
    setError(null)
    recargar(1)
  }

  async function inactivar(p: PacienteDto) {
    if (
      !confirm(
        t('MsgConfirmarInactivarPaciente').replace('{nombre}', p.nombresCompletos),
      )
    ) {
      return
    }
    try {
      await api.inactivarPaciente(p.id)
      setExito(t('MsgPacienteInactivado').replace('{nombre}', p.nombresCompletos))
      recargar()
    } catch (e) {
      setError(msgError(e))
    }
  }

  return (
    <div>
      <Cabecera
        titulo={t('PantallaClientes')}
        sub={t('PacientesSub')}
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
            {t('LabelNombre')}
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
            {t('LabelNumeroDocumento')}
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
            {t('LabelTipoIdentificacion')}
            <select
              id="f-tipo-doc"
              value={tipoIdFiltro}
              onChange={(e) => setTipoIdFiltro(e.target.value)}
              className={inputCls}
            >
              <option value="">{t('LabelTodos')}</option>
              {tiposId.map((ti) => (
                <option key={ti.id} value={ti.id}>
                  {ti.nombre}
                </option>
              ))}
            </select>
          </label>
          <label
            className="block text-sm font-medium lg:col-span-3"
            htmlFor="f-aseguradora"
          >
            {t('LabelAseguradora')}
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
            {t('BtnBuscar')}
          </button>
          <button
            type="button"
            onClick={() => setModo('crear')}
            className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            {t('BtnNuevoPaciente')}
          </button>
        </div>
      </div>

      {(modo === 'crear' || modo === 'editar') && (
        <FormPaciente
          tiposId={tiposId}
          tiposUsuario={tiposUsuario}
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
                setExito(t('MsgPacienteCreado'))
              } else if (editarPaciente) {
                await api.actualizarPaciente(editarPaciente.id, payload)
                setExito(t('MsgPacienteActualizado'))
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
          {t('MsgSinPacientes')}
        </div>
      )}

      {!cargando && datos && datos.items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-foreground/60">
                  <th className="px-4 py-3">{t('ColIdentificacion')}</th>
                  <th className="px-4 py-3">{t('ColNumero')}</th>
                  <th className="px-4 py-3">{t('ColNombresCompletos')}</th>
                  <th className="px-4 py-3">{t('ColSexo')}</th>
                  <th className="px-4 py-3">{t('ColFechaNacimiento')}</th>
                  <th className="px-4 py-3">{t('LabelAseguradora')}</th>
                  <th className="px-4 py-3">{t('ColRegimen')}</th>
                  <th className="px-4 py-3">{t('ColContacto')}</th>
                  <th className="px-4 py-3">{t('ColEstado')}</th>
                  <th className="px-4 py-3">{t('ColAcciones')}</th>
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
                        {p.activo ? t('EstadoActivo') : t('EstadoInactivo')}
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

          {datos.totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-foreground/60">
              <span>
                {t('MsgPaginaDe').replace('{actual}', String(datos.pagina)).replace('{total}', String(datos.totalPaginas))} · {t('MsgPacientesEncontrados').replace('{total}', String(datos.total))}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={datos.pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  {t('BtnAnterior')}
                </button>
                <button
                  type="button"
                  disabled={datos.pagina >= datos.totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  {t('BtnSiguiente')}
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
  tiposId,
  tiposUsuario,
  paciente,
  guardando,
  onCancelar,
  onGuardar,
}: {
  tiposId: TipoIdentificacionDto[]
  tiposUsuario: TipoUsuarioDto[]
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
  const { t } = useCatalogo()
  const esEdicion = paciente !== null
  const [tipoDoc, setTipoDoc] = useState(
    String(
      tiposId.find((ti) => ti.codigo === paciente?.tipoIdentificacion)?.id ??
        tiposId[0]?.id ??
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
    if (!nombres.trim()) e.push(t('ValidacionNombresObligatorios'))
    if (!numDoc.trim()) e.push(t('ValidacionDocumentoObligatorio'))
    if (!nacimiento) e.push(t('ValidacionNacimientoObligatorio'))
    if (!sexo) e.push(t('ValidacionSexoObligatorio'))
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
    <Seccion titulo={esEdicion ? t('TituloEditarPaciente') : t('TituloNuevoPaciente')}>
      {errors.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor="p-tipo-doc">
          {t('LabelTipoIdentificacion')}
          <select
            id="p-tipo-doc"
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
        <label className="block text-sm font-medium" htmlFor="p-documento">
          {t('LabelNumeroDocumento')}
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
            {t('LabelNombresCompletos')}
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
          {t('LabelFechaNacimiento')}
          <input
            id="p-nacimiento"
            type="date"
            value={nacimiento}
            onChange={(e) => setNacimiento(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="p-sexo">
          {t('LabelSexo')}
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

      <h3 className="mb-3 mt-6 border-t border-border pt-4 text-sm font-semibold">{t('SeccionContacto')}</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium" htmlFor="p-celular">
          {t('LabelCelular')}
          <input
            id="p-celular"
            type="tel"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="p-email">
          {t('LabelCorreoElectronico')}
          <input
            id="p-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="p-whatsapp">
          {t('LabelWhatsApp')}
          <input
            id="p-whatsapp"
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      <h3 className="mb-3 mt-6 border-t border-border pt-4 text-sm font-semibold">{t('SeccionCobertura')}</h3>
      <div className="grid gap-4 sm:grid-cols-1">
        <label className="block text-sm font-medium" htmlFor="p-aseguradora">
            {t('LabelAseguradora')}
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
          {t('LabelRegimen')}
          <select
            id="p-regimen"
            value={tipoUsuarioId}
            onChange={(e) => setTipoUsuarioId(e.target.value)}
            className={inputCls}
          >
            <option value="">{t('LabelSinRegimen')}</option>
            {tiposUsuario.map((tu) => (
              <option key={tu.id} value={tu.id}>
                {tu.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="p-empresa">
          {t('LabelEmpresa')}
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
          {guardando ? t('MsgGuardando') : esEdicion ? t('BtnGuardarCambios') : t('BtnRegistrarPaciente')}
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
