import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let aplicado = false

/**
 * El bundler no resuelve las URLs de íconos por defecto de Leaflet (asume rutas
 * relativas al CSS); sin esto el marcador no se ve en el mapa. Seguro de llamar
 * varias veces.
 */
export function asegurarIconoPorDefecto() {
  if (aplicado) return
  aplicado = true
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  })
}
