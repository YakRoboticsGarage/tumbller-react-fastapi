/**
 * Generate a UUID (v4)
 *
 * Uses crypto.randomUUID() if available (HTTPS/localhost),
 * otherwise falls back to a polyfill for HTTP contexts
 */
export function generateUUID(): string {
  // Try native crypto.randomUUID (works in secure contexts: HTTPS or localhost)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // Fall through to polyfill if it fails
    }
  }

  // Fallback for non-secure contexts (HTTP over network)
  // RFC4122 version 4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
