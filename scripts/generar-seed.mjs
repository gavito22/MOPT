import ExcelJS from 'exceljs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const FUENTE = 'C:/Users/jpaniagua/Documents/Proyectos/Revisión viviendas unifamiliares'

function esc(valor) {
  return String(valor).replace(/'/g, "''")
}

async function leerUbicaciones() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(path.join(FUENTE, 'ProvinciaCantonDistrito.xlsx'))
  const sheet = wb.worksheets[0]
  const filas = []
  let headerVisto = false
  sheet.eachRow((row) => {
    const [, provincia, canton, distrito] = row.values
    if (!headerVisto) {
      headerVisto = true
      return
    }
    if (!provincia || !canton || !distrito) return
    filas.push({ provincia: String(provincia).trim(), canton: String(canton).trim(), distrito: String(distrito).trim() })
  })
  return filas
}

async function leerRegionales() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(path.join(FUENTE, 'Proyectos Copilado.xlsx'))
  const sheet = wb.getWorksheet('Regional')
  const nombres = []
  let headerVisto = false
  sheet.eachRow((row) => {
    const valor = row.values[1]
    if (!headerVisto) {
      headerVisto = true
      return
    }
    if (valor) nombres.push(String(valor).trim())
  })
  return nombres
}

async function main() {
  const ubicaciones = await leerUbicaciones()
  const regionales = await leerRegionales()

  const lineas = []
  lineas.push('-- Generado por scripts/generar-seed.mjs — no editar a mano.')
  lineas.push('')
  lineas.push('insert into ubicaciones_cr (provincia, canton, distrito) values')
  lineas.push(
    ubicaciones
      .map((u) => `  ('${esc(u.provincia)}', '${esc(u.canton)}', '${esc(u.distrito)}')`)
      .join(',\n') + ';',
  )
  lineas.push('')
  lineas.push('insert into regionales (nombre, orden) values')
  lineas.push(
    regionales.map((r, i) => `  ('${esc(r)}', ${i + 1})`).join(',\n') + '\non conflict do nothing;',
  )
  lineas.push('')

  const destino = new URL('../supabase/seed.sql', import.meta.url)
  await writeFile(destino, lineas.join('\n'), 'utf-8')
  console.log(`Generado supabase/seed.sql: ${ubicaciones.length} ubicaciones, ${regionales.length} regionales.`)
}

main()
