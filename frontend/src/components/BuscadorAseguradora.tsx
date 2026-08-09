import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useConfigBusqueda } from '../lib/configBusqueda'
import type { AseguradoraDto } from '../lib/types'

interface Props {
  /** Id actual seleccionado como texto ('' = sin selección). */
  id?: string
  /** Nombre visible cuando hay selección previa (edición o filtro). */
  nombre?: string
  /** Notifica cuando hay selección o limpieza. */
  onCambio: (id: string, nombre?: string) => void
  placeholder?: string
  disabled?: boolean
  /** Mínimo de caracteres para disparar la búsqueda (default: del contrato). */
  minCaracteres?: number
  /** Identificador de la pantalla para el mínimo por pantalla. */
  pantalla?: string
}

export default function BuscadorAseguradora({
  id = '',
  nombre,
  onCambio,
  placeholder = 'Busque aseguradora…',
  disabled = false,
  minCaracteres,
  pantalla = 'aseguradora',
}: Props) {
  const configBusqueda = useConfigBusqueda()
  const minEfectivo = minCaracteres ?? configBusqueda.minimoCampo(pantalla, 'aseguradora')
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [opciones, setOpciones] = useState<AseguradoraDto[]>([])
  const [activo, setActivo] = useState(0)
  const [seleccionado, setSeleccionado] = useState<{ id: string; nombre: string } | null>(
    id ? { id, nombre: nombre ?? '' } : null,
  )
  const refContenedor = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!id) {
      setSeleccionado(null)
      setTexto('')
    } else if (id && nombre) {
      setSeleccionado({ id, nombre: `${nombre}` })
    }
  }, [id, nombre])

  function buscar(q: string) {
    window.clearTimeout(timerRef.current)
    setOpciones([])
    if (q.trim().length < minEfectivo) return
    setCargando(true)
    timerRef.current = window.setTimeout(() => {
      api
        .aseguradoras({ nombre: q || undefined })
        .then((list) => {
          setOpciones(list)
          setActivo(0)
        })
        .catch(() => setOpciones([]))
        .finally(() => setCargando(false))
    }, 250)
  }

  function onTexto(e: React.ChangeEvent<HTMLInputElement>) {
    setTexto(e.target.value)
    setSeleccionado(null)
    setAbierto(true)
    buscar(e.target.value)
  }

  function elegir(a: AseguradoraDto) {
    setSeleccionado({ id: String(a.id), nombre: `${a.sigla} — ${a.nombre}` })
    setTexto('')
    setAbierto(false)
    onCambio(String(a.id), a.nombre)
  }

  function limpiar() {
    setSeleccionado(null)
    setTexto('')
    setAbierto(false)
    onCambio('')
  }

  useEffect(() => {
    function alClickFuera(e: MouseEvent) {
      if (refContenedor.current && !refContenedor.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', alClickFuera)
    return () => document.removeEventListener('mousedown', alClickFuera)
  }, [])

  function alTeclado(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAbierto(true)
      setActivo((a) => Math.min(a + 1, opciones.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (abierto && opciones[activo]) {
        elegir(opciones[activo])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setAbierto(false)
    }
  }

  const mostrarPlaceholder = seleccionado ? '' : placeholder

  return (
    <div ref={refContenedor} className="relative">
      {seleccionado ? (
        <div className="mt-1 flex items-center justify-between rounded-md border border-border bg-white px-3 py-2 text-sm">
          <span className="truncate">{seleccionado.nombre}</span>
          {!disabled && (
            <button
              type="button"
              onClick={limpiar}
              aria-label="Quitar aseguradora"
              className="ml-2 shrink-0 rounded p-0.5 text-foreground/60 hover:bg-muted hover:text-foreground"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            type="search"
            role="combobox"
            aria-expanded={abierto}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-label="Buscar aseguradora"
            value={texto}
            onChange={onTexto}
            onFocus={() => setAbierto(true)}
            onKeyDown={alTeclado}
            disabled={disabled}
            placeholder={mostrarPlaceholder}
            className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {abierto && (
            <>
              {cargando && opciones.length === 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-white p-3 text-sm text-foreground/60 shadow-lg">
                  Buscando…
                </div>
              )}

              {!cargando && texto.trim().length > 0 && texto.trim().length < minEfectivo && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-white p-3 text-sm text-foreground/60 shadow-lg">
                  Escriba al menos {minEfectivo} caracteres para buscar.
                </div>
              )}

              {!cargando && texto.trim().length >= minEfectivo && opciones.length > 0 && (
                <ul
                  role="listbox"
                  aria-label="Resultados de aseguradoras"
                  className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-white shadow-lg"
                >
                  {opciones.map((a, i) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={activo === i}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          elegir(a)
                        }}
                        onMouseEnter={() => setActivo(i)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                          activo === i ? 'bg-primary/10' : ''
                        }`}
                      >
                        <span className="truncate font-medium">{a.nombre}</span>
                        <span className="ml-2 shrink-0 text-xs text-foreground/50">{a.sigla}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!cargando && texto.trim().length >= minEfectivo && opciones.length === 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-white p-3 text-sm text-foreground/60 shadow-lg">
                  Sin resultados.
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}