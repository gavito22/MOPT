import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { capturarMapa } from './useMapCapture'
import { subirImagenMapa, actualizarVivienda } from './api'
import type { ViviendaRow } from './database.types'

// Mismo fix que UbicacionTab.vue: el bundler no resuelve las URLs de íconos por
// defecto de Leaflet. Se repite aquí porque este módulo puede ejecutarse sin que
// UbicacionTab.vue se haya montado nunca en la sesión.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

/** Tamaño mínimo (bytes) que debería pesar una captura con tiles cargados; menos que esto
 * indica casi con certeza un mapa en blanco (tiles que no llegaron a cargar a tiempo). */
const PESO_MINIMO_CAPTURA = 8000

function esperarTiles(mapa: L.Map): Promise<void> {
  return new Promise((resolve) => {
    let resuelto = false
    const terminar = () => {
      if (resuelto) return
      resuelto = true
      resolve()
    }
    mapa.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) layer.once('load', terminar)
    })
    setTimeout(terminar, 6000)
  })
}

/**
 * Vuelve a capturar y subir la imagen del mapa de una vivienda con el zoom/calidad actuales.
 * Si la captura sale sospechosamente liviana (probable mapa en blanco por tiles que no
 * cargaron a tiempo), lanza un error en vez de subir una imagen mala y pisar la anterior.
 */
export async function regenerarMapaVivienda(vivienda: ViviendaRow): Promise<boolean> {
  if (vivienda.lat == null || vivienda.lng == null) return false

  const contenedor = document.createElement('div')
  // Dentro del viewport (no muy lejos con left:-9999px) y detrás de todo con z-index
  // negativo: algunos navegadores postergan la carga de recursos de elementos muy
  // lejos de la pantalla, lo que dejaba el mapa capturado en blanco.
  contenedor.style.cssText =
    'position:fixed; top:0; left:0; width:900px; height:500px; z-index:-1000; pointer-events:none;'
  document.body.appendChild(contenedor)

  try {
    const mapa = L.map(contenedor, { zoomControl: false, attributionControl: false }).setView(
      [vivienda.lat, vivienda.lng],
      17,
    )
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { crossOrigin: true }).addTo(mapa)
    L.marker([vivienda.lat, vivienda.lng]).addTo(mapa)
    mapa.invalidateSize()

    await esperarTiles(mapa)
    await new Promise((resolve) => setTimeout(resolve, 500))

    const blob = await capturarMapa(contenedor)
    if (blob.size < PESO_MINIMO_CAPTURA) {
      throw new Error('La captura del mapa salió en blanco (tiles sin cargar a tiempo).')
    }
    const url = await subirImagenMapa(vivienda.id, blob)
    await actualizarVivienda(vivienda.id, { mapa_imagen_url: url })
    mapa.remove()
    return true
  } finally {
    contenedor.remove()
  }
}

export async function regenerarTodosLosMapas(
  viviendas: ViviendaRow[],
  onProgreso?: (hechos: number, total: number) => void,
): Promise<{ ok: number; fallidas: ViviendaRow[] }> {
  const conPunto = viviendas.filter((v) => v.lat != null && v.lng != null)
  let ok = 0
  const fallidas: ViviendaRow[] = []
  for (let i = 0; i < conPunto.length; i++) {
    try {
      if (await regenerarMapaVivienda(conPunto[i])) ok++
    } catch {
      // Un solo reintento: la falla más común es una captura en blanco por timing,
      // que suele salir bien en un segundo intento.
      try {
        if (await regenerarMapaVivienda(conPunto[i])) ok++
        else fallidas.push(conPunto[i])
      } catch {
        fallidas.push(conPunto[i])
      }
    }
    onProgreso?.(i + 1, conPunto.length)
  }
  return { ok, fallidas }
}
