import { uuid } from './util.js'

// A single navigation. Created by Navigator#startVisit, driven through its
// lifecycle by turbo.js, and delegated to the driver to perform the Inertia
// visit and report progress to native.
export default class Visit {
  identifier = uuid()
  started = false

  constructor(delegate, location, restorationIdentifier, options = {}) {
    this.delegate = delegate
    this.location = location
    this.restorationIdentifier = restorationIdentifier || uuid()
    this.action = options.action
  }

  get adapter() {
    return this.delegate.adapter
  }

  start() {
    if (this.started) return
    this.adapter.visitStarted(this)
    this.delegate.visitStarted(this)
    this.started = true
  }

  issueRequest() {
    this.delegate.issueRequest(this)
  }

  changeHistory() {
    this.delegate.changeHistory(this)
  }

  loadCachedSnapshot() {
    this.delegate.loadCachedSnapshot(this)
  }

  loadResponse() {
    this.delegate.loadResponse(this)
  }

  cancel() {
    this.delegate.cancelVisit(this)
  }

  hasCachedSnapshot() {
    return this.delegate.hasCachedSnapshot(this)
  }

  // turbo.js reads this as a property, not a call.
  get isPageRefresh() {
    return this.delegate.isPageRefresh(this)
  }
}
