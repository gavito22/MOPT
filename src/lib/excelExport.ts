import ExcelJS from 'exceljs'
import type { DatosCrudosRow, ViviendaRow } from './database.types'

function parseFechaCR(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const m = valor.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, d, mo, y] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function cellText(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'object' && 'text' in (value as { text?: string })) {
    return String((value as { text: string }).text).trim() || null
  }
  const s = String(value).trim()
  return s || null
}

function cellNumber(value: ExcelJS.CellValue): number | null {
  const n = Number(cellText(value))
  return Number.isFinite(n) ? n : null
}

/** Encuentra la fila de encabezados (la que contiene "Código APC") y arma un mapa columna->índice. */
export async function parseDatosCrudosExcel(
  file: File,
): Promise<Omit<DatosCrudosRow, 'id' | 'importado_en' | 'procesado'>[]> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]

  let headerRowNumber = -1
  const headers = new Map<string, number>()
  sheet.eachRow((row, rowNumber) => {
    if (headerRowNumber !== -1) return
    row.eachCell((cell, colNumber) => {
      if (cellText(cell.value) === 'Código APC') {
        headerRowNumber = rowNumber
      }
      headers.set(cellText(cell.value) ?? '', colNumber)
    })
    if (headerRowNumber === -1) headers.clear()
  })
  if (headerRowNumber === -1) {
    throw new Error('No se encontró la columna "Código APC" en el archivo.')
  }

  const col = (nombre: string) => headers.get(nombre) ?? -1

  const filas: Omit<DatosCrudosRow, 'id' | 'importado_en' | 'procesado'>[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return
    const codigoApc = cellText(row.getCell(col('Código APC')).value)
    if (!codigoApc) return
    filas.push({
      fase_revision: cellText(row.getCell(col('Fase de revisión')).value),
      subproyecto: cellText(row.getCell(col('Subproyecto')).value),
      descripcion_proyecto: cellText(row.getCell(col('Descripción del Proyecto')).value),
      area_tasada: cellNumber(row.getCell(col('Área tasada')).value),
      codigo_cfia: cellText(row.getCell(col('Código CFIA')).value),
      codigo_apc: codigoApc,
      dias_decreto: cellNumber(row.getCell(col('Días decreto')).value),
      fecha_inicio: parseFechaCR(row.getCell(col('Inicio')).value),
      fecha_vencimiento: parseFechaCR(row.getCell(col('Vencimiento')).value),
      propietario: cellText(row.getCell(col('Propietario')).value),
      carnet: cellText(row.getCell(col('Carnet')).value),
      valor_total: cellNumber(row.getCell(col('Valor Total')).value),
      remodelacion: cellText(row.getCell(col('Remodelación')).value),
      ampliacion: cellText(row.getCell(col('Ampliación')).value),
      coordenadas_raw: cellText(row.getCell(col('Coordenadas')).value),
      catastro: cellText(row.getCell(col('Catastro')).value),
    })
  })

  return filas
}

async function descargarWorkbook(workbook: ExcelJS.Workbook, nombreArchivo: string) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}

const COLOR_PRIMERA = 'FF133C65'
const COLOR_SEGUNDA = 'FF376092'
const COLOR_TERCERA = 'FF558ED5'

const COLUMNAS_COMPENDIO: { key: string; header: string }[] = [
  { key: 'codigo_cfia', header: 'Código CFIA' },
  { key: 'codigo_apc', header: 'Código APC' },
  { key: 'nombre_proyecto', header: 'Nombre del proyecto' },
  { key: 'tipo_ingreso', header: 'Tipo de ingreso' },
  { key: 'dias_decreto', header: 'Días decreto' },
  { key: 'propietario', header: 'Propietario' },
  { key: 'ruta_nacional', header: 'Ruta' },
  { key: 'catastro', header: 'Catastro' },
  { key: 'coordenadas', header: 'Coordenadas' },
  { key: 'primera_inicio', header: 'Inicio' },
  { key: 'primera_vencimiento', header: 'Vencimiento' },
  { key: 'primera_resolucion', header: 'Resolucion' },
  { key: 'primera_fecha_resolucion', header: 'Fecha de resolucion' },
  { key: 'primera_revisado_por', header: 'Revisado por' },
  { key: 'segunda_inicio', header: 'Inicio ' },
  { key: 'segunda_vencimiento', header: 'Vencimiento' },
  { key: 'segunda_resolucion', header: 'Resolucion ' },
  { key: 'segunda_fecha_resolucion', header: 'Fecha de resolucion ' },
  { key: 'segunda_revisado_por', header: 'Revisado por' },
  { key: 'tercera_inicio', header: 'Inicio ' },
  { key: 'tercera_vencimiento', header: 'Vencimiento' },
  { key: 'tercera_resolucion', header: 'Resolucion ' },
  { key: 'tercera_fecha_resolucion', header: 'Fecha de resolucion' },
  { key: 'tercera_revisado_por', header: 'Revisado por' },
  { key: 'permiso_ejecucion_funcionamiento', header: 'Permiso de ejecucion y funcionamiento' },
  { key: 'fecha_permiso_ejecucion_funcionamiento', header: 'Fecha permiso de ejecucion y funcionamiento' },
  { key: 'regional', header: 'Regional' },
  { key: 'observaciones', header: 'Observaciones ' },
  { key: 'ficha', header: 'Ficha' },
]

/** Columnas (1-based, inclusive) que ocupa cada bloque de revisión en COLUMNAS_COMPENDIO. */
const GRUPOS_REVISION: { desde: number; hasta: number; titulo: string; color: string }[] = [
  { desde: 10, hasta: 14, titulo: '', color: COLOR_PRIMERA },
  { desde: 15, hasta: 19, titulo: 'Segunda Revisión', color: COLOR_SEGUNDA },
  { desde: 20, hasta: 24, titulo: 'Tercera Revisión', color: COLOR_TERCERA },
]

export async function exportCompendio(viviendas: ViviendaRow[]) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Copilado')
  sheet.columns = COLUMNAS_COMPENDIO.map((c) => ({ key: c.key, width: 22 }))

  // Fila 1: banner con el título general y el nombre de cada revisión sobre su bloque de columnas.
  const filaTitulo = sheet.getRow(1)
  filaTitulo.height = 21
  for (let col = 1; col <= COLUMNAS_COMPENDIO.length; col++) {
    if (col >= 10 && col <= 24) continue
    filaTitulo.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMERA } }
  }
  filaTitulo.getCell(1).value = 'Viviendas Unifamiliares'
  filaTitulo.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' }, name: 'Calibri' }
  for (const grupo of GRUPOS_REVISION) {
    sheet.mergeCells(1, grupo.desde, 1, grupo.hasta)
    const celda = filaTitulo.getCell(grupo.desde)
    if (grupo.titulo) {
      celda.value = grupo.titulo
      celda.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' }, name: 'Calibri' }
      celda.alignment = { horizontal: 'center', vertical: 'middle' }
    }
    for (let col = grupo.desde; col <= grupo.hasta; col++) {
      filaTitulo.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: grupo.color } }
    }
  }

  // Fila 2: encabezados de columna, con el color del bloque de revisión que les corresponde.
  const filaEncabezado = sheet.getRow(2)
  COLUMNAS_COMPENDIO.forEach((c, i) => {
    const col = i + 1
    const grupo = GRUPOS_REVISION.find((g) => col >= g.desde && col <= g.hasta)
    const celda = filaEncabezado.getCell(col)
    celda.value = c.header
    celda.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' }, name: 'Calibri' }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: grupo?.color ?? COLOR_PRIMERA } }
  })

  for (const v of viviendas) {
    sheet.addRow({
      codigo_cfia: v.codigo_cfia,
      codigo_apc: v.codigo_apc,
      nombre_proyecto: v.nombre_proyecto,
      tipo_ingreso: v.tipo_ingreso,
      dias_decreto: v.dias_decreto,
      propietario: v.propietario,
      ruta_nacional: v.ruta_nacional,
      catastro: v.catastro,
      coordenadas: v.coordenadas_raw,
      primera_inicio: v.fecha_inicio,
      primera_vencimiento: v.fecha_vencimiento,
      primera_resolucion: v.primera_resolucion,
      primera_fecha_resolucion: v.primera_fecha,
      primera_revisado_por: v.primera_revisado_por,
      segunda_inicio: v.segunda_fecha_inicio,
      segunda_vencimiento: v.segunda_fecha_vencimiento,
      segunda_resolucion: v.segunda_resolucion,
      segunda_fecha_resolucion: v.segunda_fecha,
      segunda_revisado_por: v.segunda_revisado_por,
      tercera_inicio: v.tercera_fecha_inicio,
      tercera_vencimiento: v.tercera_fecha_vencimiento,
      tercera_resolucion: v.tercera_resolucion,
      tercera_fecha_resolucion: v.tercera_fecha,
      tercera_revisado_por: v.tercera_revisado_por,
      permiso_ejecucion_funcionamiento: v.permiso_ejecucion_funcionamiento,
      fecha_permiso_ejecucion_funcionamiento: v.fecha_permiso_ejecucion_funcionamiento,
      regional: v.regionales?.nombre ?? null,
      observaciones: v.observaciones,
      ficha: null,
    })
  }

  await descargarWorkbook(workbook, 'Proyectos Copilado.xlsx')
}

