// ============================================================
//  AGENDA MÉDICA — PERFILES SIMULADOS (MVP)
//  Proyecto : AgendaMedica / frontend / src / lib
//  Archivo  : perfil.ts
// ============================================================
//  Simula varios operadores con el mismo navegador y permisos.
//  Cada perfil tiene su propio ambiente (favoritos, selección,
//  conocidos, recientes) separando las claves de localStorage.
//  Temporal para el MVP: cuando exista autenticación real, el
//  perfil vendrá del backend y este módulo se reemplaza.
// ============================================================

export type PerfilId = 'u1' | 'u2'

export const PERFILES: { id: PerfilId; nombre: string }[] = [
  { id: 'u1', nombre: 'Usuario 1' },
  { id: 'u2', nombre: 'Usuario 2' },
]

const LS_PERFIL_ACTIVO = 'agenda:perfil:activo'

// Claves heredadas sin perfil (se migraron al Usuario 1).
const LEGADO: Record<string, string> = {
  favoritos: 'agenda:recursos:favoritos',
  conocidos: 'agenda:recursos:conocidos',
  recientes: 'agenda:recursos:recientes',
  seleccion: 'agenda:recursos:seleccion',
  estados: 'agenda:recursos:estados',
}

export type ClaveAmbiente = keyof typeof LEGADO

/** Lee el perfil activo (por defecto Usuario 1). */
export function leerPerfilActivo(): PerfilId {
  try {
    const v = localStorage.getItem(LS_PERFIL_ACTIVO)
    return v === 'u2' ? 'u2' : 'u1'
  } catch {
    return 'u1'
  }
}

/** Guarda el perfil activo. */
export function guardarPerfilActivo(perfil: PerfilId) {
  try {
    localStorage.setItem(LS_PERFIL_ACTIVO, perfil)
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Clave de ambiente con espacio de nombres por perfil. */
export function clavePerfil(perfil: PerfilId, clave: ClaveAmbiente): string {
  return `agenda:${perfil}:recursos:${clave}`
}

/** Lee una clave del perfil. Lo heredado (sin perfil) migra solo al Usuario 1;
 *  el Usuario 2 siempre arranca con ambiente limpio. */
export function leerIdsPerfil(perfil: PerfilId, clave: ClaveAmbiente): number[] {
  const leer = (k: string): number[] | null => {
    try {
      const v = JSON.parse(localStorage.getItem(k) ?? 'null')
      return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : null
    } catch {
      return null
    }
  }
  const propio = leer(clavePerfil(perfil, clave))
  if (propio !== null) return propio
  if (perfil === 'u1') return leer(LEGADO[clave]) ?? []
  return []
}

/** Indica si existe ambiente guardado (propio o heredado) para el perfil.
 *  Permite distinguir "nunca guardó" (usar valores por defecto) de un
 *  guardado explícito aunque sea vacío (respetarlo tal cual). */
export function hayAmbienteGuardado(perfil: PerfilId, clave: ClaveAmbiente): boolean {
  try {
    if (localStorage.getItem(clavePerfil(perfil, clave)) !== null) return true
    if (perfil === 'u1' && localStorage.getItem(LEGADO[clave]) !== null) return true
    return false
  } catch {
    return false
  }
}

/** Guarda una clave del ambiente del perfil. */
export function guardarIdsPerfil(perfil: PerfilId, clave: ClaveAmbiente, ids: number[]) {
  try {
    localStorage.setItem(clavePerfil(perfil, clave), JSON.stringify(ids))
  } catch {
    /* almacenamiento no disponible */
  }
}
