// Debug logging for the bridge. Off by default; enable via
// initHotwireNative({ debug: true }). Logs appear in the webview console.
let debugEnabled = false

export function enableDebug() {
  debugEnabled = true
}

// direction: 'native' (web↔native bridge) or 'inertia' (Inertia router events).
export function log(direction, event, detail = {}) {
  if (!debugEnabled) return
  const icon = direction === 'native' ? '→ [native]' : '← [inertia]'
  console.log(`[hotwire-native] ${icon} ${event}`, detail)
}
