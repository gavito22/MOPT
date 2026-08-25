import { toPng } from 'html-to-image'

export async function capturarMapa(elemento: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(elemento, { pixelRatio: 1.5 })
  const resp = await fetch(dataUrl)
  return resp.blob()
}
