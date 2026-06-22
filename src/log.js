// Lightweight debug logging for the Hotwire Native bridge. Off by default;
// enable via initHotwireNative({ debug: true }). Logs show up in the webview
// console (attach Safari Web Inspector to the simulator to see them).
let debugEnabled = false

export function enableDebug() {
  debugEnabled = true
}

// direction: 'native' (web → native / native → web bridge) or 'inertia'
// (Inertia router events). Helps read the message flow in the console.
export function log(direction, event, detail = {}) {
  if (!debugEnabled) return
  const icon = direction === 'native' ? '→ [native]' : '← [inertia]'
  console.log(`[hotwire-native] ${icon} ${event}`, detail)
}
