// Minimal stub of Turbo's PageView. turbo.js calls cacheSnapshot() and
// scrollToAnchorFromLocation() on it, but Inertia/React manages its own
// rendering and scrolling, so both are no-ops.
export default class PageView {
  constructor(delegate, element) {
    this.delegate = delegate
    this.element = element
  }

  cacheSnapshot() {}

  scrollToAnchorFromLocation(_location) {}
}
