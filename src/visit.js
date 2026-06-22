import { uuid } from './util.js'

// A single navigation. Created by Navigator#startVisit when the native side
// requests a visit, and driven through its lifecycle by turbo.js (which calls
// issueRequest/changeHistory/loadCachedSnapshot/loadResponse/cancel) and by
// the driver (the delegate) that actually performs the Inertia visit.
//
// Driver (delegate) contract:
//   get adapter()
//   visitStarted(visit)
//   issueRequest(visit)
//   changeHistory(visit)
//   loadCachedSnapshot(visit)
//   loadResponse(visit)
//   cancelVisit(visit)
//   hasCachedSnapshot(visit) -> boolean
//   isPageRefresh(visit)     -> boolean
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

  // A getter: turbo.js reads `visit.isPageRefresh` as a property, not a call.
  get isPageRefresh() {
    return this.delegate.isPageRefresh(this)
  }
}
