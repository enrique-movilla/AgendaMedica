// ============================================================
//  AGENDA MÉDICA — CONFIGURACIÓN DE BÚSQUEDA (frontend)
//  Archivo  : lib/configBusqueda.ts
// ============================================================
//  Consume el endpoint GET /v1/config/busqueda y permite a cada
//  pantalla sobreescribir el mínimo de caracteres exigidos por
//  campo, guardando el estado en localStorage. Nunca baja del
//  piso que exige el servidor (minimoCaracteres).
// ============================================================

import { useEffect, useState } from 'react'
import { api } from './api'
import type { ConfiguracionBusquedaCampo } from './types'

const PREFIJO_CLAVE = 'agenda.busqueda.min'

export function claveMinimo(pantalla: string, campo: string): string {
  return `${PREFIJO_CLAVE}.${pantalla}.${campo}`
}

export function leerMinimoLocal(pantalla: string, campo: string): number | null {
  const raw = localStorage.getItem(claveMinimo(pantalla, campo))
  if (!raw) return null
  const n = Number(raw)
  return Number.isNaN(n) ? null : n
}

export function guardarMinimoLocal(pantalla: string, campo: string, valor: number | null) {
  if (valor === null) {
    localStorage.removeItem(claveMinimo(pantalla, campo))
  } else {
    localStorage.setItem(claveMinimo(pantalla, campo), String(valor))
  }
}

export interface ConfigBusqueda {
  cargando: boolean
  porCampo: Record<string, ConfiguracionBusquedaCampo>
  /** Mínimo efectivo para (pantalla, campo): local si existe, si no el del servidor. */
  minimoCampo: (pantalla: string, campo: string) => number
  /** Guarda un mínimo local (clamped entre el piso y el máximo del contrato). */
  fijarMinimo: (pantalla: string, campo: string, valor: number) => void
  /** Restaura al piso del servidor (borra el override local). */
  restaurarMinimo: (pantalla: string, campo: string) => void
}

let cacheCampos: ConfiguracionBusquedaCampo[] | null = null
let promesaCampos: Promise<ConfiguracionBusquedaCampo[]> | null = null

function cargarCampos(): Promise<ConfiguracionBusquedaCampo[]> {
  if (promesaCampos) return promesaCampos
  promesaCampos = api
    .configBusqueda()
    .then((lista) => {
      cacheCampos = lista
      return lista
    })
    .catch((e) => {
      promesaCampos = null
      throw e
    })
  return promesaCampos
}

export function useConfigBusqueda(): ConfigBusqueda {
  const [campos, setCampos] = useState<ConfiguracionBusquedaCampo[]>(cacheCampos ?? [])
  const [cargando, setCargando] = useState(campos.length === 0)

  useEffect(() => {
    let activo = true
    if (cacheCampos) {
      setCargando(false)
      return
    }
    cargarCampos()
      .then((lista) => {
        if (activo) setCampos(lista)
      })
      .catch(() => {
        if (activo) setCampos([])
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  const porCampo: Record<string, ConfiguracionBusquedaCampo> = Object.fromEntries(
    campos.map((c) => [c.campo, c]),
  )

  function minEfectivo(pantalla: string, campo: string): number {
    const regla = porCampo[campo]
    if (!regla) return 3
    const local = leerMinimoLocal(pantalla, campo)
    if (local === null) return regla.minimoCaracteres
    return Math.min(Math.max(local, regla.minimoCaracteres), regla.maximoCaracteres)
  }

  function fijar(pantalla: string, campo: string, valor: number) {
    const regla = porCampo[campo]
    const clamp = regla
      ? Math.min(Math.max(Math.trunc(valor), regla.minimoCaracteres), regla.maximoCaracteres)
      : Math.max(1, Math.trunc(valor))
    guardarMinimoLocal(pantalla, campo, clamp)
  }

  function restaurar(pantalla: string, campo: string) {
    guardarMinimoLocal(pantalla, campo, null)
  }

  return {
    cargando,
    porCampo,
    minimoCampo: minEfectivo,
    fijarMinimo: fijar,
    restaurarMinimo: restaurar,
  }
}