import PageView from './page-view.js'
import { log } from './log.js'

// Glue between turbo.js (the native adapter, injected by Hotwire Native) and
// the Inertia driver. turbo.js calls registerAdapter() and reads `view`;
// the driver is registered by initHotwireNative().
export default class Session {
  view = new PageView(this, document.documentElement)

  registerAdapter(adapter) {
    log('native', 'adapter registered (turbo.js connected)')
    this.adapter = adapter
  }

  registerDriver(driver) {
    this.driver = driver
    driver.start()
  }

  // Called by the driver when an Inertia link is tapped, to ask the native
  // side whether/how to present the destination (push, modal, etc.).
  visitProposedToLocation(location, options) {
    log('inertia', 'visitProposedToLocation', { location: location.toString(), options })
    this.adapter?.visitProposedToLocation(location, options)
  }

  // turbo.js calls this on clearSnapshotCache(); Inertia manages its own cache.
  clearCache() {}
}
