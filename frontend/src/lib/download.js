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
  // Some browsers cancel the download if the blob is revoked in the same tick.
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

/**
 * Fetch a protected file and return a temporary object URL. Callers that embed
 * the URL (e.g. an <iframe>) must revoke it with URL.revokeObjectURL.
 */
export async function fileObjectUrl(url) {
  const res = await api.get(url, { responseType: 'blob' })
  const type = res.headers['content-type'] || 'application/octet-stream'
  const blob = new Blob([res.data], { type })
  return {
    url: URL.createObjectURL(blob),
    name: filenameFromDisposition(res.headers['content-disposition']),
    type,
  }
}

/**
 * Open a protected attachment in a new tab (PDFs and images render inline).
 * Falls back to a download when the browser blocks the popup.
 */
export async function previewFile(url, fallbackName = 'attachment') {
  const file = await fileObjectUrl(url)
  const win = window.open(file.url, '_blank')
  if (win) {
    try { win.opener = null } catch { /* cross-origin blob URL; ignore */ }
  } else {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name || fallbackName
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
  // Give the new tab time to load before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(file.url), 5 * 60 * 1000)
}

function filenameFromDisposition(disposition = '') {
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(disposition)
  if (!match || !match[1]) return null
  try { return decodeURIComponent(match[1]) } catch { return match[1] }
}
