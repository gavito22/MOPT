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

function estiloEncabezado(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF133C65' } }
  })
  sheet.columns.forEach((c) => {
    c.width = 22
  })
}

/** Última revisión (1ra/2da/3ra) que ya tiene una resolución registrada. */
function revisionVigente(v: ViviendaRow) {
  if (v.tercera_resolucion) {
    return {
      resolucion: v.tercera_resolucion,
      fecha: v.tercera_fecha,
      revisado_por: v.tercera_revisado_por,
      observaciones: v.tercera_observaciones,
      oficio_informe_regional: v.tercera_oficio_informe_regional,
      fecha_informe: v.tercera_fecha_informe,
      oficio_permiso_funcionamiento: v.tercera_oficio_permiso_funcionamiento,
      fecha_permiso_funcionamiento: v.tercera_fecha_permiso_funcionamiento,
    }
  }
  if (v.segunda_resolucion) {
    return {
      resolucion: v.segunda_resolucion,
      fecha: v.segunda_fecha,
      revisado_por: v.segunda_revisado_por,
      observaciones: v.segunda_observaciones,
      oficio_informe_regional: v.segunda_oficio_informe_regional,
      fecha_informe: v.segunda_fecha_informe,
      oficio_permiso_funcionamiento: v.segunda_oficio_permiso_funcionamiento,
      fecha_permiso_funcionamiento: v.segunda_fecha_permiso_funcionamiento,
    }
  }
  return {
    resolucion: v.primera_resolucion,
    fecha: v.primera_fecha,
    revisado_por: v.primera_revisado_por,
    observaciones: v.primera_observaciones,
    oficio_informe_regional: v.primera_oficio_informe_regional,
    fecha_informe: v.primera_fecha_informe,
    oficio_permiso_funcionamiento: v.primera_oficio_permiso_funcionamiento,
    fecha_permiso_funcionamiento: v.primera_fecha_permiso_funcionamiento,
  }
}

export async function exportCompendio(viviendas: ViviendaRow[]) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Copilado')
  sheet.columns = [
    { header: 'ID', key: 'id' },
    { header: 'Código CFIA', key: 'codigo_cfia' },
    { header: 'Código APC', key: 'codigo_apc' },
    { header: 'Nombre del proyecto', key: 'nombre_proyecto' },
    { header: 'Tipo de ingreso', key: 'tipo_ingreso' },
    { header: 'Días decreto', key: 'dias_decreto' },
    { header: 'Inicio', key: 'fecha_inicio' },
    { header: 'Vencimiento', key: 'fecha_vencimiento' },
    { header: 'Propietario', key: 'propietario' },
    { header: 'Ruta', key: 'ruta_nacional' },
    { header: 'Catastro', key: 'catastro' },
    { header: 'Coordenadas', key: 'coordenadas' },
    { header: 'Regional', key: 'regional' },
    { header: 'Resolución', key: 'resolucion' },
    { header: 'Fecha de resolución', key: 'fecha_resolucion' },
    { header: 'Revisado por', key: 'revisado_por' },
    { header: 'Oficio o informe de regional', key: 'oficio_informe_regional' },
    { header: 'Fecha informe', key: 'fecha_informe' },
    { header: 'Oficio permiso de funcionamiento', key: 'oficio_funcionamiento' },
    { header: 'Fecha permiso de funcionamiento', key: 'fecha_funcionamiento' },
    { header: 'Observaciones', key: 'observaciones' },
  ]

  for (const v of viviendas) {
    const r = revisionVigente(v)
    sheet.addRow({
      id: v.id,
      codigo_cfia: v.codigo_cfia,
      codigo_apc: v.codigo_apc,
      nombre_proyecto: v.nombre_proyecto,
      tipo_ingreso: v.tipo_ingreso,
      dias_decreto: v.dias_decreto,
      fecha_inicio: v.fecha_inicio,
      fecha_vencimiento: v.fecha_vencimiento,
      propietario: v.propietario,
      ruta_nacional: v.ruta_nacional,
      catastro: v.catastro,
      coordenadas: v.coordenadas_raw,
      regional: v.regionales?.nombre ?? null,
      resolucion: r.resolucion,
      fecha_resolucion: r.fecha,
      revisado_por: r.revisado_por,
      oficio_informe_regional: r.oficio_informe_regional,
      fecha_informe: r.fecha_informe,
      oficio_funcionamiento: r.oficio_permiso_funcionamiento,
      fecha_funcionamiento: r.fecha_permiso_funcionamiento,
      observaciones: r.observaciones,
    })
  }

  estiloEncabezado(sheet)
  await descargarWorkbook(workbook, 'Proyectos Copilado.xlsx')
}

