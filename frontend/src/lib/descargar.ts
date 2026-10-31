/** Saves a file returned by the API (for example an invoice PDF) with the name the server suggests. */
export function guardarArchivo({ archivo, nombre }: { archivo: Blob; nombre: string }): void {
  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  // Give the browser a moment to start the download before releasing the memory.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
