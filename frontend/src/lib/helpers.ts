// ============================================================
//  SINCORA — UTILIDADES COMPARTIDAS
//  Proyecto : AgendaMedica / frontend / src / lib
//  Archivo  : helpers.ts
// ============================================================
//  Funciones puras extraídas de App.tsx para uso en todas las
//  vistas. Sin dependencias de React ni de la API.
// ============================================================

import { ApiError } from './api'

// ── Fechas ISO ──────────────────────────────────────────────

/** Retorna la fecha actual en formato ISO corto: YYYY-MM-DD. */
export function hoyISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

/** Suma n días a una fecha ISO y retorna YYYY-MM-DD. */
export function sumarDias(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dd}`
}

/** Retorna el lunes de la semana que contiene la fecha ISO dada. */
export function lunesDeLaSemana(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay()
  return sumarDias(iso, diff)
}

/** Retorna el primer y último día del mes que contiene la fecha ISO. */
export function primerUltimoDiaMes(iso: string): { primero: string; ultimo: string } {
  const d = new Date(`${iso}T00:00:00`)
  const primero = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const uLtimo = `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, '0')}-${String(
    ultimo.getDate(),
  ).padStart(2, '0')}`
  return { primero, ultimo: uLtimo }
}

// ── Formateo de fechas/horas ────────────────────────────────

/** Convierte "HH:mm" a minutos del día (ej. "08:30" → 510). */
export function aMinutos(hm: string): number {
  const [h, m] = String(hm).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Formatea un string ISO datetime a "DD/MM/YYYY HH:mm". */
export function formatFechaHora(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Formatea un string ISO date a "DD/MM/YYYY". */
export function formatFecha(iso: string): string {
  const parts = iso.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Abrevia el nombre del día de la semana (Lun, Mar, Mié…). */
export const diaANombre = (d: Date) =>
  d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')

/**
 * La API guarda horas en hora local (sin zona).
 * Evita convertir a UTC (toISOString).
 */
export function conSegundos(fh: string): string {
  return fh.length === 16 ? `${fh}:00` : fh
}

// ── Errores ─────────────────────────────────────────────────

/** Extrae un mensaje legible de cualquier tipo de error. */
export function msgError(e: unknown): string {
  if (e instanceof ApiError) return `${e.codigo}: ${e.message}`
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return JSON.stringify(e)
}

// ── Badges de estado de cita ────────────────────────────────

/** Retorna las clases Tailwind para el badge de estado de cita. */
export function estadoBadge(estadoId: number): string {
  const clases: Record<number, string> = {
    1: 'bg-sky-50 text-sky-800 border-sky-300',      // Programada
    2: 'bg-emerald-50 text-emerald-800 border-emerald-300', // Confirmada
    3: 'bg-amber-50 text-amber-800 border-amber-300',  // En atención
    4: 'bg-teal-50 text-teal-800 border-teal-300',     // Realizada
    5: 'bg-rose-50 text-rose-800 border-rose-300',     // Cancelada
    6: 'bg-slate-100 text-slate-600 border-slate-300', // No asistió
    7: 'bg-violet-50 text-violet-800 border-violet-300', // Reprogramada
  }
  return clases[estadoId] ?? 'bg-slate-100 text-slate-700 border-slate-300'
}

/** Retorna las clases Tailwind para el color de estado en la timeline. */
export function colorEstado(estadoId: number): string {
  const colores: Record<number, string> = {
    1: '#0369a1', // Programada
    2: '#047857', // Confirmada
    3: '#b45309', // En atención
    4: '#0f766e', // Realizada
    5: '#be123c', // Cancelada
    6: '#475569', // No asistió
    7: '#6d28d9', // Reprogramada
  }
  return colores[estadoId] ?? '#475569'
}
