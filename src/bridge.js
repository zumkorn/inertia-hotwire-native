import { log } from './log.js'

// Web side of the Hotwire Native bridge. Pairs with the native bridge.js, which
// installs window.nativeBridge and, on `web-bridge:ready`, calls our
// setAdapter(). This reimplements the core of @hotwired/hotwire-native-bridge
// (just the message-passing runtime — no Stimulus). Exposed as
// window.HotwireNative.web.
//
// Native adapter contract (window.nativeBridge): platform, supportedComponents,
// supportsComponent(name), receive(message).
class WebBridge {
  #adapter = null
  #lastMessageId = 0
  #pendingMessages = [] // messages sent before the adapter connected
  #callbacks = new Map() // messageId -> callback for native replies

  start() {
    // The native bridge.js listens for this and responds by calling setAdapter.
    document.dispatchEvent(new Event('web-bridge:ready'))
  }

  // Called by the native bridge once it has connected and registered the
  // components the native app supports.
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

  // Reflect the native-supported component list onto <html> so the UI can
  // react (and so MutationObserver-based hooks can detect support).
  adapterDidUpdateSupportedComponents() {
    if (this.#adapter) {
      document.documentElement.dataset.bridgeComponents = this.#adapter.supportedComponents.join(' ')
    }
  }

  supportsComponent(component) {
    return !!this.#adapter && this.#adapter.supportsComponent(component)
  }

  // Send a message to native. Returns the message id (used for callback
  // cleanup), or null if it was queued / the component is unsupported.
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

  // A reply from native.
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
