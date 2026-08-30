import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { msgError } from '../lib/helpers'
import { inputCls } from '../lib/constants'
import type {
  CatalogoDefinicion,
  CatalogoFila,
  ResultadoCatalogo,
  DependenciaCatalogo,
} from '../lib/types'
import { Cabecera, Seccion, Spinner, Aviso, Exito } from '../components/shared'
import { useCatalogo } from '../context/CatalogoContext'

export function CatalogosView() {
  const { t } = useCatalogo()
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
        titulo={t('CatalogoTitulo')}
        sub={t('CatalogoSub')}
      />

      {defsError && <Aviso msg={defsError} />}

      <Seccion titulo={t('CatalogoSeccion')}>
        {defsCargando ? (
          <Spinner texto={t('CatalogoCargando')} />
        ) : defs.length === 0 ? (
          <p className="text-sm text-foreground/60">{t('CatalogoSinCatalogos')}</p>
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
                      {d.conteoActivos} {t('CatalogoAct')} · {d.conteoInactivos} {t('CatalogoInac')}
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-sm text-foreground/60">{d.descripcion}</span>
                <span className="mt-3 inline-block rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {t('CatalogoAdministrar')}
                </span>
              </button>
            ))}
          </div>
        )}
      </Seccion>
    </div>
  )
}

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
  const { t } = useCatalogo()
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
      setError(`${t('CatalogoCompleteCampos')} ${faltan.map((c) => c.etiqueta).join(', ')}.`)
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
        setExito(t('CatalogoRegistroCreado'))
      } else if (editarFila) {
        await api.catalogoAdminActualizar(definicion.tabla, editarFila.id, payload)
        setExito(t('CatalogoRegistroActualizado'))
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
      setExito(activo ? t('CatalogoRegistroDesactivado') : t('CatalogoRegistroActivado'))
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
      setExito(t('CatalogoRegistroBorrado'))
      cargar(1)
    } catch (e) {
      setError(msgError(e))
      setConfirmaBorrar(null)
    }
  }

  function formatoValor(v: string | number | boolean | null): string {
    if (v === null || v === undefined) return '—'
    if (typeof v === 'boolean') return v ? t('CatalogoSi') : t('CatalogoNo')
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
          {t('CatalogoVolver')}
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
          {t('CatalogoBuscar')}
          <input
            type="search"
            value={termino}
            onChange={(e) => {
              setTermino(e.target.value)
              setPagina(1)
            }}
            placeholder={t('CatalogoBuscarPlaceholder')}
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
              <option value="">{t('CatalogoTodos')}</option>
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
            {t('CatalogoSoloActivos')}
          </label>
        )}
        {datos && !cargando && (
          <span className="pb-2 text-sm text-foreground/60">
            {datos.total} {t('CatalogoRegistros')}{datos.total === 1 ? '' : 's'}
          </span>
        )}
        <button
          type="button"
          onClick={abrirCrear}
          className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          {t('CatalogoNuevoRegistro')}
        </button>
      </div>

      {modo && (
        <Seccion titulo={modo === 'crear' ? `${t('CatalogoNuevo')} ${definicion.etiqueta}` : `${t('CatalogoEditar')} ${definicion.etiqueta}`}>
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
              {guardando ? t('CatalogoGuardando') : t('CatalogoGuardar')}
            </button>
            <button
              type="button"
              onClick={() => setModo(null)}
              disabled={guardando}
              className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
            >
              {t('CatalogoCancelar')}
            </button>
          </div>
        </Seccion>
      )}

      {cargando && <Spinner />}

      {!cargando && datos && datos.items.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-foreground/60">
          {t('CatalogoNoRegistros')}
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
                  {tieneLogico && <th className="px-4 py-3">{t('CatalogoRequiereValidacion')}</th>}
                  {definicion.permiteActivos && <th className="px-4 py-3">{t('CatalogoEstado')}</th>}
                  <th className="px-4 py-3">{t('LabelAcciones')}</th>
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
                          {f.valores.activo ? t('CatalogoActivo') : t('CatalogoInactivo')}
                        </span>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => abrirEditar(f)}
                        className="mr-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted"
                      >
                        {t('CatalogoEditar')}
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
                          {f.valores.activo ? t('CatalogoDesactivar') : t('CatalogoActivar')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => verificarDependencias(f)}
                        className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                      >
                        {t('CatalogoBorrar')}
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
                {t('CatalogoPagina')} {datos.pagina} {t('CatalogoDe')} {datos.totalPaginas} · {datos.total} {t('CatalogoRegistros')}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={datos.pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  {t('CatalogoAnterior')}
                </button>
                <button
                  type="button"
                  disabled={datos.pagina >= datos.totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  {t('CatalogoSiguiente')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {dependencias && filaDependencias && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-rose-800">{t('CatalogoNoBorrar')}</h3>
            <p className="mt-2 text-sm text-foreground/70">
                {definicion.permiteActivos
                  ? t('CatalogoEnUsoDesactivar')
                  : t('CatalogoEnUsoNoBorrar')}
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
                {t('CatalogoCerrar')}
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
                  {t('CatalogoDesactivarRegistro')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmaBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold">{t('CatalogoBorrarDefinitivamente')}</h3>
            <p className="mt-2 text-sm text-foreground/70">
              {t('CatalogoRegistroEliminar')} <span className="font-semibold">{confirmaBorrar.id}</span> {t('CatalogoSeEliminara')}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmaBorrar(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
              >
                {t('CatalogoCancelar')}
              </button>
              <button
                type="button"
                onClick={borrarPermanente}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
              >
                {t('CatalogoSiBorrar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}