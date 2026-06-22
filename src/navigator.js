import { uuid, expandURL } from './util.js'
import { log } from './log.js'
import Visit from './visit.js'

// Minimal implementation of the Turbo.navigator API that turbo.js drives.
export default class Navigator {
  constructor(delegate) {
    this.delegate = delegate // Session
  }

  get location() {
    return new URL(window.location.href)
  }

  get adapter() {
    return this.delegate.adapter
  }

  get driver() {
    return this.delegate.driver
  }

  get view() {
    return this.delegate.view
  }

  get restorationIdentifier() {
    // Fall back to a generated id when the driver has no restoration identifier.
    return this.driver?.restorationIdentifier || uuid()
  }

  // Called by turbo.js when the native side requests a visit
  // (visitLocationWithOptionsAndRestorationIdentifier).
  startVisit(locatable, restorationIdentifier, options = {}) {
    log('native', 'startVisit', { location: String(locatable), restorationIdentifier, options })
    this.stop()
    this.currentVisit = new Visit(this.driver, expandURL(locatable), restorationIdentifier, options)
    this.currentVisit.start()
  }

  stop() {
    if (this.currentVisit) {
      this.currentVisit.cancel()
      delete this.currentVisit
    }
  }

  // Inertia handles its own anchor scrolling, so a visit is never treated as a
  // same-page anchor jump.
  locationWithActionIsSamePage() {
    return false
  }
}
