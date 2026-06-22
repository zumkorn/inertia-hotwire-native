import PageView from './page-view.js'
import { log } from './log.js'

// Glue between turbo.js (the native adapter) and the Inertia driver.
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

  visitProposedToLocation(location, options) {
    log('inertia', 'visitProposedToLocation', { location: location.toString(), options })
    this.adapter?.visitProposedToLocation(location, options)
  }

  clearCache() {}
}
