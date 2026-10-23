/**
 * Timestamp helpers.
 *
 * The backend serialises `LocalDateTime` values without a timezone offset
 * (for example `2026-10-24T00:54:00.123`) and the containers run with the JVM
 * on UTC. `new Date()` would read such a string as browser-local time, which
 * shifts every relative label by the client's UTC offset ("5h ago" for a
 * message that was just sent in IST). Offset-less values are therefore parsed
 * as UTC; values that already carry `Z` or `+05:30` are parsed as-is.
 */

export function parseServerTimestamp(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value !== 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const hasTime = /\d{2}:\d{2}/.test(value)
  const hasOffset = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value)
  const normalized = hasTime && !hasOffset ? `${value}Z` : value
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

export function timeAgo(value) {
  const date = parseServerTimestamp(value)
  if (!date) return ''
  const diff = Date.now() - date.getTime()
  // Small clock skew between the server and the browser should not read as
  // "in the future".
  if (diff < 60_000) return 'Just now'
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'Yesterday' : `${days}d ago`
}
