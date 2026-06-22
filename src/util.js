// v4 UUID, matching the format turbo.js / turbo-ios expect for restoration
// identifiers. Prefers the native generator; falls back for older webviews
// (WKWebView < iOS 15.4) and non-secure contexts where crypto.randomUUID is
// unavailable.
export function uuid() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16)
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function expandURL(locatable) {
  return new URL(locatable.toString(), document.baseURI)
}
