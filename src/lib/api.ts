import { supabase } from './supabase'
import type {
  DatosCrudosRow,
  ViviendaRow,
  ChecklistItemRow,
  ViviendaChecklistRow,
  RegionalRow,
  ViviendaAdjuntoRow,
  Etapa,
  DatosApcCampos,
  NumeroRevision,
  RevisionCampos,
} from './database.types'

// ---------- Datos crudos ----------

export interface CargaMasivaResultado {
  nuevos: number
  actualizados: number
  viviendasCreadas: number
}

/**
 * Carga masiva: guarda las filas en "datos_crudos" y de una vez crea una vivienda
 * "Pendiente" por cada fila que todavía no tenía una vivienda asociada (evita
 * duplicar viviendas si el mismo archivo se vuelve a subir).
 */
export async function cargarDatosCrudosMasivo(
  filas: Omit<DatosCrudosRow, 'id' | 'importado_en' | 'procesado'>[],
): Promise<CargaMasivaResultado> {
  const codigos = filas.map((f) => f.codigo_apc)
  const { data: existentes, error: errExistentes } = await supabase
    .from('datos_crudos')
    .select('codigo_apc')
    .in('codigo_apc', codigos)
  if (errExistentes) throw errExistentes
  const existentesSet = new Set((existentes ?? []).map((e) => e.codigo_apc))

  const { data: guardados, error } = await supabase
    .from('datos_crudos')
    .upsert(filas, { onConflict: 'codigo_apc' })
    .select()
  if (error) throw error

  const nuevos = filas.filter((f) => !existentesSet.has(f.codigo_apc)).length

  const pendientes = ((guardados ?? []) as DatosCrudosRow[]).filter((c) => !c.procesado)
  const creadas = await Promise.all(
    pendientes.map((c) =>
      crearVivienda(
        {
          codigo_cfia: c.codigo_cfia,
          codigo_apc: c.codigo_apc,
          nombre_proyecto: c.descripcion_proyecto,
          dias_decreto: c.dias_decreto,
          fecha_inicio: c.fecha_inicio,
          fecha_vencimiento: c.fecha_vencimiento,
          propietario: c.propietario,
          coordenadas_raw: c.coordenadas_raw,
          catastro: c.catastro,
        },
        c.id,
      ),
    ),
  )

  return { nuevos, actualizados: filas.length - nuevos, viviendasCreadas: creadas.length }
}

// ---------- Viviendas ----------

export interface ViviendasFiltros {
  desde?: string
  hasta?: string
  estado?: string
  nombre?: string
  codigoCfia?: string
  canton?: string
}

export async function listViviendas(filtros: ViviendasFiltros) {
  let query = supabase
    .from('viviendas')
    .select('*, regionales(nombre)')
    .order('created_at', { ascending: false })
  if (filtros.desde) query = query.gte('created_at', filtros.desde)
  if (filtros.hasta) query = query.lte('created_at', filtros.hasta)
  if (filtros.estado) query = query.eq('estado', filtros.estado)
  if (filtros.nombre) query = query.ilike('nombre_proyecto', `%${filtros.nombre}%`)
  if (filtros.codigoCfia) query = query.ilike('codigo_cfia', `%${filtros.codigoCfia}%`)
  if (filtros.canton) query = query.eq('canton', filtros.canton)
  const { data, error } = await query
  if (error) throw error
  return data as ViviendaRow[]
}

export async function getVivienda(id: string) {
  const { data, error } = await supabase
    .from('viviendas')
    .select('*, regionales(nombre)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as ViviendaRow
}

export async function crearVivienda(campos: DatosApcCampos, datoCrudoId?: string) {
  const { data: userData } = await supabase.auth.getUser()

  const nueva: Partial<ViviendaRow> = {
    ...campos,
    datos_crudos_id: datoCrudoId ?? null,
    tipo_ingreso: 'Primer ingreso',
    created_by: userData.user?.email ?? null,
  }

  const { data, error } = await supabase.from('viviendas').insert(nueva).select().single()
  if (error) throw error

  if (datoCrudoId) {
    await supabase.from('datos_crudos').update({ procesado: true }).eq('id', datoCrudoId)
  }

  const { data: items } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('activo', true)
    .order('orden')
  if (items?.length) {
    await supabase.from('vivienda_checklist').insert(
      items.map((item) => ({ vivienda_id: data.id, checklist_item_id: item.id })),
    )
  }

  return data as ViviendaRow
}

export async function actualizarVivienda(id: string, cambios: Partial<ViviendaRow>) {
  const { data, error } = await supabase
    .from('viviendas')
    .update({ ...cambios, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ViviendaRow
}

export async function eliminarVivienda(id: string) {
  const { error } = await supabase.from('viviendas').delete().eq('id', id)
  if (error) throw error
}

const PREFIJO_REVISION: Record<NumeroRevision, 'primera' | 'segunda' | 'tercera'> = {
  1: 'primera',
  2: 'segunda',
  3: 'tercera',
}

const SIGUIENTE_INGRESO: Record<NumeroRevision, string> = {
  1: 'Segundo ingreso',
  2: 'Tercer ingreso',
  3: 'Tercer ingreso',
}

export async function guardarRevision(id: string, numero: NumeroRevision, campos: RevisionCampos) {
  const { data: userData } = await supabase.auth.getUser()
  const p = PREFIJO_REVISION[numero]
  const cambios: Record<string, unknown> = {
    [`${p}_resolucion`]: campos.resolucion,
    [`${p}_observaciones`]: campos.observaciones,
    [`${p}_oficio_informe_regional`]: campos.oficio_informe_regional || null,
    [`${p}_fecha_informe`]: campos.fecha_informe || null,
    [`${p}_oficio_permiso_funcionamiento`]: campos.oficio_permiso_funcionamiento || null,
    [`${p}_fecha_permiso_funcionamiento`]: campos.fecha_permiso_funcionamiento || null,
    [`${p}_revisado_por`]: userData.user?.email ?? null,
    [`${p}_fecha`]: campos.fecha || new Date().toISOString(),
  }
  if (campos.resolucion === 'Rechazado') cambios.tipo_ingreso = SIGUIENTE_INGRESO[numero]
  return actualizarVivienda(id, cambios as Partial<ViviendaRow>)
}

// ---------- Checklist ----------

export async function listChecklistItems(soloActivos = true) {
  let query = supabase.from('checklist_items').select('*').order('orden')
  if (soloActivos) query = query.eq('activo', true)
  const { data, error } = await query
  if (error) throw error
  return data as ChecklistItemRow[]
}

export async function listViviendaChecklist(viviendaId: string) {
  const { data, error } = await supabase
    .from('vivienda_checklist')
    .select('*, checklist_items(nombre, orden)')
    .eq('vivienda_id', viviendaId)
  if (error) throw error
  return data as (ViviendaChecklistRow & { checklist_items: { nombre: string; orden: number } })[]
}

export async function actualizarRespuestaChecklist(
  id: string,
  cambios: Partial<ViviendaChecklistRow>,
) {
  const { error } = await supabase.from('vivienda_checklist').update(cambios).eq('id', id)
  if (error) throw error
}

export async function crearChecklistItem(nombre: string, orden: number) {
  const { error } = await supabase.from('checklist_items').insert({ nombre, orden, activo: true })
  if (error) throw error
}

export async function actualizarChecklistItem(id: string, cambios: Partial<ChecklistItemRow>) {
  const { error } = await supabase.from('checklist_items').update(cambios).eq('id', id)
  if (error) throw error
}

export async function eliminarChecklistItem(id: string) {
  const { error } = await supabase.from('checklist_items').delete().eq('id', id)
  if (error) throw error
}

// ---------- Regionales ----------

export async function listRegionales(soloActivos = true) {
  let query = supabase.from('regionales').select('*').order('orden')
  if (soloActivos) query = query.eq('activo', true)
  const { data, error } = await query
  if (error) throw error
  return data as RegionalRow[]
}

export async function crearRegional(nombre: string, orden: number) {
  const { error } = await supabase.from('regionales').insert({ nombre, orden, activo: true })
  if (error) throw error
}

export async function actualizarRegional(id: string, cambios: Partial<RegionalRow>) {
  const { error } = await supabase.from('regionales').update(cambios).eq('id', id)
  if (error) throw error
}

export async function eliminarRegional(id: string) {
  const { error } = await supabase.from('regionales').delete().eq('id', id)
  if (error) throw error
}

// ---------- Ubicaciones CR ----------

export async function listProvincias() {
  const { data, error } = await supabase.from('ubicaciones_cr').select('provincia')
  if (error) throw error
  return Array.from(new Set((data ?? []).map((r) => r.provincia))).sort()
}

export async function listCantones(provincia: string) {
  const { data, error } = await supabase
    .from('ubicaciones_cr')
    .select('canton')
    .eq('provincia', provincia)
  if (error) throw error
  return Array.from(new Set((data ?? []).map((r) => r.canton))).sort()
}

export async function listDistritos(provincia: string, canton: string) {
  const { data, error } = await supabase
    .from('ubicaciones_cr')
    .select('distrito')
    .eq('provincia', provincia)
    .eq('canton', canton)
  if (error) throw error
  return Array.from(new Set((data ?? []).map((r) => r.distrito))).sort()
}

// ---------- Adjuntos ----------

export async function listAdjuntos(viviendaId: string, etapa?: Etapa) {
  let query = supabase
    .from('vivienda_adjuntos')
    .select('*')
    .eq('vivienda_id', viviendaId)
    .order('subido_en', { ascending: false })
  if (etapa) query = query.eq('etapa', etapa)
  const { data, error } = await query
  if (error) throw error
  return data as ViviendaAdjuntoRow[]
}

export async function subirAdjunto(viviendaId: string, etapa: Etapa, file: File) {
  const { data: userData } = await supabase.auth.getUser()
  const path = `${viviendaId}/${etapa}/${Date.now()}-${file.name}`
  const { error: errUpload } = await supabase.storage.from('adjuntos').upload(path, file)
  if (errUpload) throw errUpload

  const { error } = await supabase.from('vivienda_adjuntos').insert({
    vivienda_id: viviendaId,
    etapa,
    nombre_archivo: file.name,
    storage_path: path,
    tipo_mime: file.type,
    tamano_bytes: file.size,
    subido_por: userData.user?.email ?? null,
  })
  if (error) throw error
}

export async function eliminarAdjunto(adjunto: ViviendaAdjuntoRow) {
  await supabase.storage.from('adjuntos').remove([adjunto.storage_path])
  const { error } = await supabase.from('vivienda_adjuntos').delete().eq('id', adjunto.id)
  if (error) throw error
}

export function urlAdjunto(path: string) {
  return supabase.storage.from('adjuntos').getPublicUrl(path).data.publicUrl
}

// ---------- Mapa ----------

export async function subirImagenMapa(viviendaId: string, blob: Blob) {
  const path = `${viviendaId}/${Date.now()}.png`
  const { error } = await supabase.storage.from('mapas').upload(path, blob, {
    contentType: 'image/png',
    upsert: true,
  })
  if (error) throw error
  return supabase.storage.from('mapas').getPublicUrl(path).data.publicUrl
}
