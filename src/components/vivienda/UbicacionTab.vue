<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import * as api from '@/lib/api'
import { capturarMapa } from '@/lib/useMapCapture'
import { parseCoordenadasRaw } from '@/lib/utils'
import type { ViviendaRow, RegionalRow } from '@/lib/database.types'

// El bundler no resuelve las URLs de íconos por defecto de Leaflet (asume rutas
// relativas al CSS); sin esto el marcador no se ve en el mapa.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const props = defineProps<{ vivienda: ViviendaRow }>()
const emit = defineEmits<{ guardado: [] }>()

const mapaEl = ref<HTMLDivElement>()
let mapa: L.Map | undefined
let marcador: L.Marker | undefined

const puntoInicial =
  props.vivienda.lat !== null && props.vivienda.lng !== null
    ? { lat: props.vivienda.lat, lng: props.vivienda.lng }
    : parseCoordenadasRaw(props.vivienda.coordenadas_raw)

const lat = ref(puntoInicial?.lat ?? 9.9281)
const lng = ref(puntoInicial?.lng ?? -84.0907)
const tienePunto = ref(!!puntoInicial)

const provincia = ref(props.vivienda.provincia ?? '')
const canton = ref(props.vivienda.canton ?? '')
const distrito = ref(props.vivienda.distrito ?? '')
const rutaNacional = ref<number | null>(props.vivienda.ruta_nacional)
const velocidad = ref<number | null>(props.vivienda.velocidad)
const regionalId = ref(props.vivienda.regional_id ?? '')

const provincias = ref<string[]>([])
const cantones = ref<string[]>([])
const distritos = ref<string[]>([])
const regionales = ref<RegionalRow[]>([])
const guardando = ref(false)
const mensaje = ref('')

onMounted(async () => {
  provincias.value = await api.listProvincias()
  if (provincia.value) cantones.value = await api.listCantones(provincia.value)
  if (provincia.value && canton.value) distritos.value = await api.listDistritos(provincia.value, canton.value)
  regionales.value = await api.listRegionales(true)

  if (!mapaEl.value) return
  mapa = L.map(mapaEl.value).setView([lat.value, lng.value], tienePunto.value ? 17 : 8)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    crossOrigin: true,
  }).addTo(mapa)

  if (tienePunto.value) {
    marcador = L.marker([lat.value, lng.value]).addTo(mapa)
  }

  mapa.on('click', (e: L.LeafletMouseEvent) => {
    lat.value = e.latlng.lat
    lng.value = e.latlng.lng
    tienePunto.value = true
    if (marcador) {
      marcador.setLatLng(e.latlng)
    } else if (mapa) {
      marcador = L.marker(e.latlng).addTo(mapa)
    }
  })
})

onBeforeUnmount(() => {
  mapa?.remove()
})

watch(provincia, async (nueva, anterior) => {
  if (nueva === anterior) return
  canton.value = ''
  distrito.value = ''
  cantones.value = nueva ? await api.listCantones(nueva) : []
  distritos.value = []
})

watch(canton, async (nuevo, anterior) => {
  if (nuevo === anterior) return
  distrito.value = ''
  distritos.value = nuevo ? await api.listDistritos(provincia.value, nuevo) : []
})

async function guardar() {
  if (!tienePunto.value) {
    mensaje.value = 'Marque la ubicación en el mapa.'
    return
  }
  guardando.value = true
  mensaje.value = ''
  try {
    let mapaImagenUrl = props.vivienda.mapa_imagen_url
    if (mapaEl.value) {
      const blob = await capturarMapa(mapaEl.value)
      mapaImagenUrl = await api.subirImagenMapa(props.vivienda.id, blob)
    }
    await api.actualizarVivienda(props.vivienda.id, {
      lat: lat.value,
      lng: lng.value,
      provincia: provincia.value || null,
      canton: canton.value || null,
      distrito: distrito.value || null,
      ruta_nacional: rutaNacional.value,
      velocidad: velocidad.value,
      regional_id: regionalId.value || null,
      mapa_imagen_url: mapaImagenUrl,
    })
    mensaje.value = 'Ubicación guardada.'
    emit('guardado')
  } catch (err) {
    mensaje.value = (err as { message?: string } | null)?.message || 'No se pudo guardar la ubicación.'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div ref="mapaEl" class="w-full h-80 rounded border"></div>
    <p class="text-xs text-gray-500">Haga clic en el mapa para fijar el punto del proyecto.</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label class="text-xs text-gray-500">Provincia</label>
        <select v-model="provincia" class="w-full border rounded px-2 py-1.5">
          <option value="">Seleccione…</option>
          <option v-for="p in provincias" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500">Cantón</label>
        <select v-model="canton" :disabled="!provincia" class="w-full border rounded px-2 py-1.5">
          <option value="">Seleccione…</option>
          <option v-for="c in cantones" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500">Distrito</label>
        <select v-model="distrito" :disabled="!canton" class="w-full border rounded px-2 py-1.5">
          <option value="">Seleccione…</option>
          <option v-for="d in distritos" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500">Ruta nacional</label>
        <input v-model.number="rutaNacional" type="number" class="w-full border rounded px-2 py-1.5" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Velocidad</label>
        <input v-model.number="velocidad" type="number" class="w-full border rounded px-2 py-1.5" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Regional</label>
        <select v-model="regionalId" class="w-full border rounded px-2 py-1.5">
          <option value="">Seleccione…</option>
          <option v-for="r in regionales" :key="r.id" :value="r.id">{{ r.nombre }}</option>
        </select>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button
        type="button"
        class="bg-primary text-white px-4 py-2 rounded-lg shadow-sm"
        :disabled="guardando"
        @click="guardar"
      >
        {{ guardando ? 'Guardando…' : 'Guardar ubicación' }}
      </button>
      <p class="text-sm text-gray-500">{{ mensaje }}</p>
    </div>
  </div>
</template>
