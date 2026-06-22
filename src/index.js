import Session from './session.js'
import Navigator from './navigator.js'
import InertiaDriver from './driver.js'
import { installBridge } from './bridge.js'
import { enableDebug, log } from './log.js'

// Installs the `window.Turbo` shim that Hotwire Native's injected turbo.js
// expects. In a regular browser nothing registers an adapter, so this stays
// inert; inside Hotwire Native, turbo.js connects on `turbo:load`.
export function initHotwireNative({ debug = false } = {}) {
  if (debug) enableDebug()

  // Idempotent. A second call (HMR, a double import, React StrictMode) would
  // overwrite the shim, register a second InertiaDriver — duplicating every
  // router listener, so each Inertia event reports to native twice — and
  // dispatch another turbo:load. Bail if our shim is already installed.
  if (window.Turbo?.__inertiaHotwireNative) {
    log('native', 'initHotwireNative — already installed, skipping')
    return
  }

  log('native', 'initHotwireNative — installing window.Turbo shim')

  const session = new Session()

  window.Turbo = {
    // Marks this shim as ours so a repeat call is a no-op (above).
    __inertiaHotwireNative: true,
    session,
    navigator: new Navigator(session),

    registerAdapter(adapter) {
      session.registerAdapter(adapter)
    },

    registerDriver(Driver) {
      session.registerDriver(new Driver(session))
    },
  }

  // Register the Inertia driver (start() wires up the router listeners).
  session.registerDriver(new InertiaDriver(session))

  // Install the web bridge (window.HotwireNative.web). The native bridge.js
  // connects to it on `web-bridge:ready` for bridge components (form/menu/...).
  installBridge()

  // Cold boot: turbo.js checks `window.Turbo` synchronously when it runs. If it
  // ran before our bundle, it's now waiting on a `turbo:load` event; dispatch
  // one so it registers its adapter and reports pageLoaded to native.
  setTimeout(() => {
    log('native', 'dispatching turbo:load (cold boot)')
    document.dispatchEvent(new Event('turbo:load'))
  }, 0)
}
