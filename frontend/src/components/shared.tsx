// ============================================================
//  SINCORA — COMPONENTES COMPARTIDOS
//  Proyecto : AgendaMedica / frontend / src / components
//  Archivo  : shared.tsx
// ============================================================
//  Componentes de UI reutilizables en todas las vistas.
// usan useCatalogo() para textos paramétricos por vertical.
// ============================================================

import { useEffect, useRef } from 'react'
import { useCatalogo } from '../context/CatalogoContext'
import { formatFechaHora } from '../lib/helpers'
import type { CitaDto } from '../lib/types'

// ── Cabecera de página ──────────────────────────────────────

export function Cabecera({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold text-foreground">{titulo}</h1>
      <p className="mt-1 text-sm text-foreground/60">{sub}</p>
    </header>
  )
}

// ── Sección con título ──────────────────────────────────────

export function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-lg border border-border bg-white p-5">
      <h2 className="mb-4 text-base font-semibold">{titulo}</h2>
      {children}
    </section>
  )
}

// ── Spinner de carga ────────────────────────────────────────

export function Spinner({ texto }: { texto?: string }) {
  const { t } = useCatalogo()
  const label = texto ?? t('MsgCargando')
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-5 py-4 text-sm text-foreground/70" role="status">
      <svg className="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span>{label}</span>
    </div>
  )
}

// ── Mensajes de estado ──────────────────────────────────────

export function Aviso({ msg }: { msg: string }) {
  return (
    <p className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      {msg}
    </p>
  )
}

export function Exito({ msg }: { msg: string }) {
  return (
    <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      {msg}
    </p>
  )
}

// ── Fila de detalle (key-value) ─────────────────────────────

export function FilaDetalle({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-foreground/50">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  )
}

// ── Modal de éxito al crear cita ────────────────────────────

export function ModalExitoCreacion({ cita, onOk }: { cita: CitaDto; onOk: () => void }) {
  const { t } = useCatalogo()
  const botonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    botonRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        onOk()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onOk])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onOk}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('TerminoCita')}
        className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          {t('TerminoCita')} creada
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <FilaDetalle k={t('TerminoCita')} v={`#${cita.id}`} />
          <FilaDetalle k={t('TerminoCliente')} v={cita.paciente.nombresCompletos} />
          <FilaDetalle k="Fecha y hora" v={formatFechaHora(cita.fechaHora)} />
          <FilaDetalle k={t('TerminoRecurso')} v={cita.profesional.nombresCompletos} />
          <FilaDetalle k={t('TerminoServicio')} v={cita.tipoCita.nombre} />
        </div>
        <button
          ref={botonRef}
          type="button"
          onClick={onOk}
          className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          OK · {t('PantallaOperacionHoy')}
        </button>
        <p className="mt-2 text-center text-[11px] text-foreground/50">
          Presione Enter o haga clic en OK
        </p>
      </div>
    </div>
  )
}

// ── Modal de error/advertencia ──────────────────────────────

export function ModalError({ msg, onCerrar }: { msg: string; onCerrar: () => void }) {
  const botonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    botonRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        onCerrar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Error"
        className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-700">
          Error o advertencia
        </p>
        <p className="mt-3 max-h-60 select-text overflow-y-auto whitespace-pre-wrap rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {msg}
        </p>
        <button
          ref={botonRef}
          type="button"
          onClick={onCerrar}
          className="mt-5 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Entendido
        </button>
        <p className="mt-2 text-center text-[11px] text-foreground/50">
          Seleccione el texto para copiarlo · Enter o clic para cerrar
        </p>
      </div>
    </div>
  )
}
