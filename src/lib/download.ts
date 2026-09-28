/** Nombre del archivo que indica la API en la cabecera Content-Disposition. */
export function fileNameFrom(response: Response, fallback: string) {
  const header = response.headers.get('Content-Disposition') ?? ''
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8) return decodeURIComponent(utf8[1])
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain ? plain[1] : fallback
}

/** Guarda un archivo recibido de la API en la carpeta de descargas del usuario. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
