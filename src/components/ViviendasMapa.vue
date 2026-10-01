<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import { asegurarIconoPorDefecto } from '@/lib/leafletIcons'
import type { ViviendaRow } from '@/lib/database.types'

const props = defineProps<{ viviendas: ViviendaRow[] }>()

asegurarIconoPorDefecto()

const mapaEl = ref<HTMLDivElement>()
let mapa: L.Map | undefined
let marcadores: L.Marker[] = []

function escapar(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  return String(valor).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

function popupHtml(v: ViviendaRow): string {
  const fila = (label: string, valor: unknown) => `<div><strong>${label}:</strong> ${escapar(valor)}</div>`
  return `
    <div style="font-size:12px; line-height:1.5; max-width:240px;">
      <div style="font-weight:700; font-size:13px; margin-bottom:4px;">${escapar(v.codigo_cfia)}</div>
      ${fila('Código CFIA', v.codigo_cfia)}
      ${fila('Código APC', v.codigo_apc)}
      ${fila('Nombre del proyecto', v.nombre_proyecto)}
      ${fila('Días decreto', v.dias_decreto)}
      ${fila('Propietario', v.propietario)}
      ${fila('Coordenadas', v.coordenadas_raw)}
      ${fila('Catastro', v.catastro)}
      ${fila('Provincia', v.provincia)}
      ${fila('Cantón', v.canton)}
      ${fila('Distrito', v.distrito)}
      ${fila('Ruta nacional', v.ruta_nacional)}
      ${fila('Velocidad', v.velocidad)}
      ${fila('Regional', v.regionales?.nombre)}
      ${fila('Estado', v.estado)}
    </div>
  `
}

function pintarMarcadores() {
  if (!mapa) return
  marcadores.forEach((m) => m.remove())
  marcadores = []

  const conPunto = props.viviendas.filter(
    (v): v is ViviendaRow & { lat: number; lng: number } => v.lat != null && v.lng != null,
  )
  for (const v of conPunto) {
    const marcador = L.marker([v.lat, v.lng]).addTo(mapa)
    marcador.bindPopup(popupHtml(v))
    marcadores.push(marcador)
  }

  if (conPunto.length > 1) {
    const bounds = L.latLngBounds(conPunto.map((v) => [v.lat, v.lng]))
    mapa.fitBounds(bounds, { padding: [30, 30] })
  } else if (conPunto.length === 1) {
    mapa.setView([conPunto[0].lat, conPunto[0].lng], 15)
  } else {
    mapa.setView([9.9281, -84.0907], 8)
  }
}

onMounted(() => {
  if (!mapaEl.value) return
  mapa = L.map(mapaEl.value).setView([9.9281, -84.0907], 8)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
  }).addTo(mapa)
  pintarMarcadores()
})

watch(() => props.viviendas, pintarMarcadores)

onBeforeUnmount(() => {
  mapa?.remove()
})
</script>

<template>
  <div ref="mapaEl" class="w-full h-[600px] rounded-lg border"></div>
</template>
