import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ViviendaRow, ViviendaChecklistRow, NumeroRevision } from './database.types'

type ChecklistConNombre = ViviendaChecklistRow & { checklist_items: { nombre: string; orden: number } }

const MARGEN_X = 14
const COLOR_PRIMARIO: [number, number, number] = [19, 60, 101]
const COLOR_SECUNDARIO: [number, number, number] = [55, 96, 146]

function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

function asegurarEspacio(doc: jsPDF, y: number, necesario: number): number {
  const alturaPagina = doc.internal.pageSize.getHeight()
  if (y + necesario > alturaPagina - 15) {
    doc.addPage()
    return 18
  }
  return y
}

function dibujarSeccion(doc: jsPDF, titulo: string, y: number): number {
  y = asegurarEspacio(doc, y, 12)
  doc.setFillColor(...COLOR_PRIMARIO)
  doc.rect(MARGEN_X, y - 5, 182, 7, 'F')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(titulo, MARGEN_X + 2, y)
  doc.setTextColor(20, 20, 20)
  return y + 8
}

function tablaClaveValor(doc: jsPDF, y: number, filas: [string, string][]): number {
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN_X, right: MARGEN_X },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    body: filas,
  })
  return finalY(doc) + 6
}

async function cargarImagenBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url)
    const blob = await resp.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Recorta la imagen tipo "cover" al tamaño destino (sin estirarla, sin
 * deformar el aspecto) y le redondea las esquinas, devolviendo un PNG nuevo.
 */
async function recortarYRedondear(
  dataUrl: string,
  anchoMm: number,
  altoMm: number,
  radioMm: number,
): Promise<string> {
  const escala = 8 // px por mm, buena calidad de impresión
  const anchoPx = Math.round(anchoMm * escala)
  const altoPx = Math.round(altoMm * escala)
  const radioPx = Math.round(radioMm * escala)

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('No se pudo cargar la imagen del mapa'))
    el.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = anchoPx
  canvas.height = altoPx
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  ctx.beginPath()
  ctx.moveTo(radioPx, 0)
  ctx.arcTo(anchoPx, 0, anchoPx, altoPx, radioPx)
  ctx.arcTo(anchoPx, altoPx, 0, altoPx, radioPx)
  ctx.arcTo(0, altoPx, 0, 0, radioPx)
  ctx.arcTo(0, 0, anchoPx, 0, radioPx)
  ctx.closePath()
  ctx.clip()

  const escalaCover = Math.max(anchoPx / img.width, altoPx / img.height)
  const wDestino = img.width * escalaCover
  const hDestino = img.height * escalaCover
  ctx.drawImage(img, (anchoPx - wDestino) / 2, (altoPx - hDestino) / 2, wDestino, hDestino)

  return canvas.toDataURL('image/png')
}

export async function exportFichaPdf(
  vivienda: ViviendaRow,
  checklistsPorRevision: Record<NumeroRevision, ChecklistConNombre[]>,
) {
  const doc = new jsPDF()
  let y = 20

  doc.setTextColor(...COLOR_PRIMARIO)
  doc.setFontSize(16)
  doc.text(`Código CFIA: ${vivienda.codigo_cfia ?? '—'}`, MARGEN_X, y)
  y += 7
  doc.setFontSize(14)
  doc.text(vivienda.nombre_proyecto || 'Ficha de proyecto', MARGEN_X, y)
  y += 9

  y = dibujarSeccion(doc, 'Datos del APC', y)
  y = tablaClaveValor(doc, y, [
    ['Código CFIA', vivienda.codigo_cfia ?? '—'],
    ['Código APC', vivienda.codigo_apc ?? '—'],
    ['Días decreto', vivienda.dias_decreto != null ? String(vivienda.dias_decreto) : '—'],
    ['Propietario', vivienda.propietario ?? '—'],
    ['Catastro', vivienda.catastro ?? '—'],
    ['Coordenadas', vivienda.coordenadas_raw ?? '—'],
  ])

  y = dibujarSeccion(doc, 'Ubicación', y)
  y = asegurarEspacio(doc, y, 68)
  const yInicioUbicacion = y
  const anchoColUbicacion = 85
  const xImagen = MARGEN_X + anchoColUbicacion + 12

  autoTable(doc, {
    startY: yInicioUbicacion,
    margin: { left: MARGEN_X },
    tableWidth: anchoColUbicacion,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    body: [
      ['Provincia', vivienda.provincia ?? '—'],
      ['Cantón', vivienda.canton ?? '—'],
      ['Distrito', vivienda.distrito ?? '—'],
      ['Ruta nacional', vivienda.ruta_nacional != null ? String(vivienda.ruta_nacional) : '—'],
      ['Velocidad', vivienda.velocidad != null ? String(vivienda.velocidad) : '—'],
      ['Regional', vivienda.regionales?.nombre ?? '—'],
    ],
  })
  let yFinal = finalY(doc)

  if (vivienda.mapa_imagen_url) {
    const dataUrl = await cargarImagenBase64(vivienda.mapa_imagen_url)
    if (dataUrl) {
      const anchoImg = 85
      const altoImg = 62
      const imagenFinal = await recortarYRedondear(dataUrl, anchoImg, altoImg, 4)
      doc.addImage(imagenFinal, 'PNG', xImagen, yInicioUbicacion, anchoImg, altoImg)
      yFinal = Math.max(yFinal, yInicioUbicacion + altoImg)
    }
  }

  y = yFinal + 8

  const revisiones = [
    {
      numero: 1 as NumeroRevision,
      etiqueta: 'Primera revisión',
      resolucion: vivienda.primera_resolucion,
      fecha: vivienda.primera_fecha,
      fecha_inicio: vivienda.fecha_inicio,
      fecha_vencimiento: vivienda.fecha_vencimiento,
      revisado_por: vivienda.primera_revisado_por,
    },
    {
      numero: 2 as NumeroRevision,
      etiqueta: 'Segunda revisión',
      resolucion: vivienda.segunda_resolucion,
      fecha: vivienda.segunda_fecha,
      fecha_inicio: vivienda.segunda_fecha_inicio,
      fecha_vencimiento: vivienda.segunda_fecha_vencimiento,
      revisado_por: vivienda.segunda_revisado_por,
    },
    {
      numero: 3 as NumeroRevision,
      etiqueta: 'Tercera revisión',
      resolucion: vivienda.tercera_resolucion,
      fecha: vivienda.tercera_fecha,
      fecha_inicio: vivienda.tercera_fecha_inicio,
      fecha_vencimiento: vivienda.tercera_fecha_vencimiento,
      revisado_por: vivienda.tercera_revisado_por,
    },
  ].filter((r) => r.resolucion)

  if (!revisiones.length) {
    y = dibujarSeccion(doc, 'Resultado de la revisión', y)
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text('Sin revisiones registradas.', MARGEN_X, y)
    y += 6
  }

  for (const r of revisiones) {
    y = dibujarSeccion(doc, r.etiqueta, y)
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN_X, right: MARGEN_X },
      head: [['Resultado', 'Fecha', 'Inicio', 'Vencimiento', 'Revisado por']],
      body: [
        [
          r.resolucion ?? '—',
          r.fecha?.slice(0, 10) ?? '—',
          r.fecha_inicio ?? '—',
          r.fecha_vencimiento ?? '—',
          r.revisado_por || '—',
        ],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: COLOR_SECUNDARIO },
    })
    y = finalY(doc) + 6

    const checklist = [...(checklistsPorRevision[r.numero] ?? [])].sort(
      (a, b) => a.checklist_items.orden - b.checklist_items.orden,
    )
    if (checklist.length) {
      y = asegurarEspacio(doc, y, 12)
      autoTable(doc, {
        startY: y,
        margin: { left: MARGEN_X, right: MARGEN_X },
        head: [['Ítem', 'Estado', 'Observación']],
        body: checklist.map((item) => [item.checklist_items.nombre, item.estado ?? '—', item.observacion || '—']),
        styles: { fontSize: 9 },
        headStyles: { fillColor: COLOR_SECUNDARIO },
      })
      y = finalY(doc) + 6
    }
  }

  const algunaAprobada =
    vivienda.primera_resolucion === 'Aprobado' ||
    vivienda.segunda_resolucion === 'Aprobado' ||
    vivienda.tercera_resolucion === 'Aprobado'

  if (algunaAprobada) {
    y = dibujarSeccion(doc, 'Permiso de ejecución y funcionamiento', y)
    y = tablaClaveValor(doc, y, [
      ['Permiso de ejecución y funcionamiento', vivienda.permiso_ejecucion_funcionamiento ?? '—'],
      ['Fecha permiso de ejecución y funcionamiento', vivienda.fecha_permiso_ejecucion_funcionamiento ?? '—'],
      ['Observaciones', vivienda.observaciones ?? '—'],
    ])
  }

  const nombreArchivo = `Ficha - ${vivienda.codigo_apc ?? vivienda.id} - ${vivienda.nombre_proyecto ?? ''}.pdf`
  doc.save(nombreArchivo)
}
