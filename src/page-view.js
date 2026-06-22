// Stub of Turbo's PageView. Inertia/React manages its own rendering and
// scrolling, so the methods turbo.js calls are no-ops.
export default class PageView {
  constructor(delegate, element) {
    this.delegate = delegate
    this.element = element
  }

  cacheSnapshot() {}

  scrollToAnchorFromLocation(_location) {}
}
