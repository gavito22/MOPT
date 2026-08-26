export type Resolucion = 'Aprobado' | 'Rechazado'
export type EstadoChecklist = 'Cumple' | 'No cumple'
export type Etapa = 'Primera revisión' | 'Segunda revisión' | 'Tercera revisión'
export type NumeroRevision = 1 | 2 | 3
export type Estado =
  | 'Pendiente'
  | 'Aprobado (1era revisión)'
  | 'Rechazado (1era revisión)'
  | 'Aprobado (2da revisión)'
  | 'Rechazado (2da revisión)'
  | 'Aprobado (3era revisión)'
  | 'Rechazado (3era revisión)'

/** Campos que tiene cada una de las 3 revisiones (mismo formato para las 3). */
export interface RevisionCampos {
  resolucion: Resolucion | null
  fecha: string | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  observaciones: string | null
  oficio_informe_regional: string | null
  fecha_informe: string | null
  oficio_permiso_funcionamiento: string | null
  fecha_permiso_funcionamiento: string | null
}

export interface DatosCrudosRow {
  id: string
  fase_revision: string | null
  subproyecto: string | null
  descripcion_proyecto: string | null
  area_tasada: number | null
  codigo_cfia: string | null
  codigo_apc: string
  dias_decreto: number | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  propietario: string | null
  carnet: string | null
  valor_total: number | null
  remodelacion: string | null
  ampliacion: string | null
  coordenadas_raw: string | null
  catastro: string | null
  importado_en: string
  procesado: boolean
}

export interface DatosApcCampos {
  codigo_cfia: string | null
  codigo_apc: string | null
  nombre_proyecto: string | null
  dias_decreto: number | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  propietario: string | null
  coordenadas_raw: string | null
  catastro: string | null
}

export interface ViviendaRow {
  id: string
  codigo_cfia: string | null
  codigo_apc: string | null
  nombre_proyecto: string | null
  dias_decreto: number | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  propietario: string | null
  coordenadas_raw: string | null
  catastro: string | null
  datos_crudos_id: string | null
  lat: number | null
  lng: number | null
  provincia: string | null
  canton: string | null
  distrito: string | null
  ruta_nacional: number | null
  velocidad: number | null
  regional_id: string | null
  /** Solo presente cuando la consulta hace join con "regionales" (select con "regionales(nombre)"). */
  regionales?: { nombre: string } | null
  mapa_imagen_url: string | null
  tipo_ingreso: string | null
  estado: Estado
  primera_resolucion: Resolucion | null
  primera_observaciones: string | null
  primera_oficio_informe_regional: string | null
  primera_fecha_informe: string | null
  primera_oficio_permiso_funcionamiento: string | null
  primera_fecha_permiso_funcionamiento: string | null
  primera_revisado_por: string | null
  primera_fecha: string | null
  segunda_resolucion: Resolucion | null
  segunda_observaciones: string | null
  segunda_fecha_inicio: string | null
  segunda_fecha_vencimiento: string | null
  segunda_oficio_informe_regional: string | null
  segunda_fecha_informe: string | null
  segunda_oficio_permiso_funcionamiento: string | null
  segunda_fecha_permiso_funcionamiento: string | null
  segunda_revisado_por: string | null
  segunda_fecha: string | null
  tercera_resolucion: Resolucion | null
  tercera_observaciones: string | null
  tercera_fecha_inicio: string | null
  tercera_fecha_vencimiento: string | null
  tercera_oficio_informe_regional: string | null
  tercera_fecha_informe: string | null
  tercera_oficio_permiso_funcionamiento: string | null
  tercera_fecha_permiso_funcionamiento: string | null
  tercera_revisado_por: string | null
  tercera_fecha: string | null
  created_at: string
  created_by: string | null
  updated_at: string
}

export interface ChecklistItemRow {
  id: string
  nombre: string
  orden: number
  activo: boolean
}

export interface ViviendaChecklistRow {
  id: string
  vivienda_id: string
  checklist_item_id: string
  estado: EstadoChecklist | null
  observacion: string | null
}

export interface RegionalRow {
  id: string
  nombre: string
  orden: number
  activo: boolean
}

export interface UbicacionCrRow {
  id: string
  provincia: string
  canton: string
  distrito: string
}

export interface ViviendaAdjuntoRow {
  id: string
  vivienda_id: string
  etapa: Etapa
  nombre_archivo: string
  storage_path: string
  tipo_mime: string | null
  tamano_bytes: number | null
  subido_por: string | null
  subido_en: string
}

