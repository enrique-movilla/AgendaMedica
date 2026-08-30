import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useCatalogo } from '../context/CatalogoContext'
import { useConfigBusqueda } from '../lib/configBusqueda'
import { conSegundos, msgError } from '../lib/helpers'
import { inputCls } from '../lib/constants'
import { Cabecera, Seccion, ModalExitoCreacion, ModalError } from '../components/shared'
import BuscadorAseguradora from '../components/BuscadorAseguradora'
import type { CitaHint } from './AgendaView'
import type {
  CitaDto,
  PacienteListaDto,
  ProfesionalResumenDto,
  TipoCitaDto,
  TipoUsuarioDto,
} from '../lib/types'

export type { CitaHint }

export function NuevaCitaView({
  hint,
  onFinalizar,
  onAbandonar,
}: {
  hint: CitaHint | null
  onFinalizar?: (cita: CitaDto) => void
  onAbandonar?: () => void
}) {
  const { t } = useCatalogo()
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

  const [profesionales, setProfesionales] = useState<ProfesionalResumenDto[]>([])
  const [tiposCita, setTiposCita] = useState<TipoCitaDto[]>([])
  const [tiposUsuario, setTiposUsuario] = useState<TipoUsuarioDto[]>([])

  useEffect(() => {
    Promise.all([api.profesionales(), api.tiposCita(), api.tiposUsuario()])
      .then(([profs, tc, tu]) => {
        setProfesionales(profs)
        setTiposCita(tc)
        setTiposUsuario(tu)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (docBusqueda.trim().length < configBusqueda.minimoCampo('citas', 'nombre')) {
      setPacientes(null)
      return
    }
    const timer = setTimeout(() => {
      api
        .pacientes({ nombre: docBusqueda.trim(), tamPagina: 8 })
        .then(setPacientes)
        .catch((e) => setError(msgError(e)))
    }, 400)
    return () => clearTimeout(timer)
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
        titulo={t('TerminoCita')}
        sub="Registre una cita para un paciente existente. La duración depende del tipo de cita."
      />

      {resultado && <ModalExitoCreacion cita={resultado} onOk={() => onFinalizar?.(resultado)} />}

      <Seccion titulo={t('TerminoCliente')}>
        <label className="block text-sm font-medium" htmlFor="buscar-paciente">
          {t('AccionBuscarCliente')}
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
                  {p.tipoIdentificacion} {p.numeroIdentificacion} · {p.edadAnios} {t('UnidadAnios')}
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

      <Seccion titulo={t('TerminoCita')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            {t('TerminoRecurso')}
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
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombresCompletos} — {p.especialidad}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            {t('TerminoServicio')}
            <select
              value={tipoCitaId ?? ''}
              onChange={(e) => setTipoCitaId(e.target.value ? Number(e.target.value) : null)}
              className={inputCls}
            >
              <option value="">Seleccione…</option>
              {tiposCita.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.nombre} · {tc.duracionMinutos} min
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            {t('PdfColumnaFechaHora')}
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
            {t('DetalleRegimen')}
            <select
              id="cita-regimen"
              value={tipoUsuarioId ?? ''}
              onChange={(e) =>
                setTipoUsuarioId(e.target.value ? Number(e.target.value) : null)
              }
              className={inputCls}
            >
              <option value="">Del paciente</option>
              {tiposUsuario.map((tu) => (
                <option key={tu.id} value={tu.id}>
                  {tu.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium sm:col-span-2" htmlFor="cita-aseguradora">
            {t('DetalleAseguradora')}
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
          {t('DetalleMotivo')}
          <textarea
            id="cita-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            className={inputCls}
          />
        </label>
        <label className="mt-4 block text-sm font-medium" htmlFor="cita-observaciones">
          {t('DetalleObservaciones')}
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
          {enviando ? t('MsgGuardando') : t('AccionNuevaAsignacion')}
        </button>
        <button
          type="button"
          onClick={() => onAbandonar?.()}
          disabled={enviando}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('BtnCancelar')}
        </button>
      </div>

      {error && <ModalError msg={error} onCerrar={() => setError(null)} />}
    </div>
  )
}
