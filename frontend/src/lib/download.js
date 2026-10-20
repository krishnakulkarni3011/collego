import api from '../services/api'

/**
 * Download a protected file through the axios instance so the JWT is sent.
 * Plain <a href="/api/..."> links do not include the Authorization header.
 */
export async function downloadFile(url, fallbackName = 'download') {
  const res = await api.get(url, { responseType: 'blob' })

  let name = fallbackName
  const disposition = res.headers['content-disposition'] || ''
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(disposition)
  if (match && match[1]) {
    try { name = decodeURIComponent(match[1]) } catch { name = match[1] }
  }

  const blob = new Blob([res.data], {
    type: res.headers['content-type'] || 'application/octet-stream',
  })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(href)
}
