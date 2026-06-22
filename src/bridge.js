import { log } from './log.js'

// Web side of the Hotwire Native bridge, exposed as window.HotwireNative.web.
// Reimplements the message-passing core of @hotwired/hotwire-native-bridge (no
// Stimulus). The native bridge.js installs window.nativeBridge and calls
// setAdapter() on `web-bridge:ready`.
class WebBridge {
  #adapter = null
  #lastMessageId = 0
  #pendingMessages = [] // sent before the adapter connected
  #callbacks = new Map() // messageId -> callback for native replies

  start() {
    document.dispatchEvent(new Event('web-bridge:ready'))
  }

  setAdapter(adapter) {
    this.#adapter = adapter
    document.documentElement.dataset.bridgePlatform = adapter.platform
    this.adapterDidUpdateSupportedComponents()
    this.#flushPendingMessages()
    log('native', 'bridge adapter connected', {
      platform: adapter.platform,
      components: adapter.supportedComponents,
    })
  }

  // Reflect supported components onto <html> so the UI (and MutationObserver
  // hooks) can react to support changes.
  adapterDidUpdateSupportedComponents() {
    if (this.#adapter) {
      document.documentElement.dataset.bridgeComponents = this.#adapter.supportedComponents.join(' ')
    }
  }

  supportsComponent(component) {
    return !!this.#adapter && this.#adapter.supportsComponent(component)
  }

  // Returns the message id, or null if queued / the component is unsupported.
  send({ component, event, data, callback }) {
    if (!this.#adapter) {
      this.#pendingMessages.push({ component, event, data, callback })
      return null
    }
    if (!this.supportsComponent(component)) return null

    const id = (++this.#lastMessageId).toString()
    const message = { id, component, event, data: data || {} }
    log('inertia', 'bridge send', { component, event })
    this.#adapter.receive(message)
    if (callback) this.#callbacks.set(id, callback)
    return id
  }

  receive(message) {
    log('native', 'bridge receive', { component: message.component, event: message.event })
    this.#callbacks.get(message.id)?.(message)
  }

  removeCallback(id) {
    if (id) this.#callbacks.delete(id)
  }

  removePendingMessagesFor(component) {
    this.#pendingMessages = this.#pendingMessages.filter((m) => m.component !== component)
  }

  #flushPendingMessages() {
    const pending = this.#pendingMessages
    this.#pendingMessages = []
    pending.forEach((message) => this.send(message))
  }
}

export function installBridge() {
  if (window.HotwireNative) return window.HotwireNative.web

  const web = new WebBridge()
  window.HotwireNative = { web }

  web.start()
  return web
}
