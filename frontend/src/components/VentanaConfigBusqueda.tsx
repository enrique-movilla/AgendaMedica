// ============================================================
//  AGENDA MÉDICA — VENTANA DE CONFIGURACIÓN DE BÚSQUEDAS
//  Archivo  : components/VentanaConfigBusqueda.tsx
// ============================================================
//  Permite a cada pantalla ajustar el mínimo de caracteres por
//  campo de búsqueda. Usa el contrato del servidor como piso
//  (no se puede bajar del mínimo) y guarda en localStorage.
// ============================================================

import { useState } from 'react'
import { useConfigBusqueda } from '../lib/configBusqueda'

export interface PantallaBusqueda {
  id: string
  etiqueta: string
  campos: Record<string, string> // campo -> etiqueta (p. ej. nombre -> "Buscar paciente")
}

export const PANTALLAS: PantallaBusqueda[] = [
  {
    id: 'citas',
    etiqueta: 'Nueva cita',
    campos: { nombre: 'Buscar paciente', aseguradora: 'Aseguradora' },
  },
  {
    id: 'pacientes',
    etiqueta: 'Pacientes',
    campos: { nombre: 'Nombre', documento: 'Número de documento', aseguradora: 'Aseguradora' },
  },
  {
    id: 'catalogos',
    etiqueta: 'Catálogos',
    campos: { aseguradora: 'Aseguradora' },
  },
]

export default function VentanaConfigBusqueda({
  abierta,
  onCerrar,
}: {
  abierta: boolean
  onCerrar: () => void
}) {
  const config = useConfigBusqueda()
  const [pantallaId, setPantallaId] = useState<string>(PANTALLAS[0]?.id ?? 'citas')

  if (!abierta) return null

  const pantalla = PANTALLAS.find((p) => p.id === pantallaId) ?? PANTALLAS[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[8vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Configuración de búsquedas"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Configuración de búsquedas</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar configuración"
            className="rounded p-1 text-foreground/60 hover:bg-muted hover:text-foreground"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-3 text-sm text-foreground/60">
            Mínimo de caracteres exigido en cada pantalla antes de consultar. No puede ser menor
            que el piso del servidor.
          </p>

          <label className="block text-sm font-medium">
            Pantalla
            <select
              value={pantallaId}
              onChange={(e) => setPantallaId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {PANTALLAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 space-y-3">
            {config.cargando && (
              <p className="text-sm text-foreground/60" role="status">
                Cargando configuración…
              </p>
            )}
            {!config.cargando &&
              Object.entries(pantalla.campos).map(([campo, etiqueta]) => {
                const regla = config.porCampo[campo]
                if (!regla) return null
                const minimoActual = config.minimoCampo(pantalla.id, campo)
                return (
                  <div
                    key={campo}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{etiqueta}</p>
                      <p className="text-xs text-foreground/50">
                        Piso del servidor: {regla.minimoCaracteres} · máximo: {regla.maximoCaracteres}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={regla.minimoCaracteres}
                        max={regla.maximoCaracteres}
                        value={minimoActual}
                        aria-label={`Mínimo de caracteres para ${etiqueta}`}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          if (v >= regla.minimoCaracteres) {
                            config.fijarMinimo(pantalla.id, campo, v)
                          }
                        }}
                        className="w-20 rounded-md border border-border bg-white px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => config.restaurarMinimo(pantalla.id, campo)}
                        disabled={minimoActual <= regla.minimoCaracteres}
                        className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
                      >
                        Restaurar
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}