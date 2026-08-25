import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Estado } from './database.types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFecha(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CR').format(d)
}

/** Clases de color (fondo + texto) para la insignia de Estado en el listado. */
export function estadoBadgeClasses(estado: Estado): string {
  if (estado.startsWith('Rechazado')) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
  }
  if (estado.startsWith('Aprobado')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
  }
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
}

/**
 * Convierte el texto "Norte: D,M,S Este: D,M,S" (grados,minutos,segundos)
 * que trae la descarga cruda de APC a coordenadas decimales de Costa Rica.
 */
export function parseCoordenadasRaw(raw: string | null | undefined): { lat: number; lng: number } | null {
  if (!raw) return null
  const m = raw.match(/Norte:\s*(\d+),(\d+),(\d+)\s*Este:\s*(\d+),(\d+),(\d+)/i)
  if (!m) return null
  const [, latD, latM, latS, lngD, lngM, lngS] = m.map(Number)
  const lat = latD + latM / 60 + latS / 3600
  const lng = -(lngD + lngM / 60 + lngS / 3600)
  return { lat, lng }
}
