import { router } from '@inertiajs/core'
import { log } from './log.js'

// On a back/restore visit we call history.back() and wait for Inertia's quiet
// popstate restore. The browser exposes no synchronous "can I go back?" signal
// and Inertia stores no history index, so detecting "nothing to restore" can
// only be done by waiting: if no popstate arrives within this window, we assume
// there's no cached entry (cold boot onto this screen) and fall back to a fresh
// request. Generous enough to avoid a false fallback on a slow device; the
// `settled` flag prevents a late popstate from being double-handled.
const RESTORE_POPSTATE_TIMEOUT_MS = 250

// The driver bridges the Inertia router and the native turbo.js adapter.
//
// Two directions meet here:
//   - Link tapped in the webview: Inertia fires `before`; we cancel it and ask
//     the native side to present the destination (push/modal/...).
//   - Native requests a visit: turbo.js → Navigator#startVisit → Visit, which
//     calls back into the delegate methods below to perform the Inertia visit
//     and report progress to native.
export default class InertiaDriver {
  // The Visit currently being performed for a native-initiated navigation.
  // Set in issueRequest(), cleared in `finish`.
  #activeVisit = null

  // Cancel token for the in-flight Inertia request (captured via onCancelToken).
  #cancelToken = null

  // Teardown for an in-flight restore (#restoreFromHistory): removes the pending
  // popstate listener and clears the fallback timeout. Null when no restore is
  // waiting. Invoked by cancelVisit() so an interrupted restore can't later fire
  // stray adapter calls for an abandoned visit.
  #restoreCleanup = null

  constructor(session) {
    this.session = session
  }

  get adapter() {
    return this.session.adapter
  }

  get restorationIdentifier() {
    return undefined
  }

  start() {
    log('inertia', 'driver started')
    this.#setupInertiaListeners()
  }

  // --- Visit delegate (called by Visit, driven by turbo.js) ---

  visitStarted(_visit) {}

  issueRequest(visit) {
    log('inertia', 'issueRequest', { id: visit.identifier, url: visit.location.href, action: visit.action })
    this.#activeVisit = visit

    // Back/restore: restore the cached page from Inertia's history state instead
    // of re-fetching (matches Inertia's normal browser back behavior).
    if (visit.action === 'restore') {
      this.#restoreFromHistory(visit)
      return
    }

    // setTimeout(0) moves router.visit() out of the synchronous native callback
    // chain (turbo.js → visitStarted → issueRequest). Called inline, Inertia's
    // async continuation after `before` never runs in WKWebView's context.
    setTimeout(() => {
      router.visit(visit.location.href, {
        replace: visit.action === 'replace',
        onCancelToken: (token) => {
          this.#cancelToken = token
        },
      })
    }, 0)
  }

  // Restore the previous page from Inertia's history cache by replaying the
  // browser back navigation. Inertia's popstate handler swaps the cached page
  // *quietly* (no start/success/finish events, scroll restored), so we drive the
  // native visit lifecycle ourselves here. Falls back to a fresh request if
  // there's no history entry to restore (e.g. cold-booted onto this screen).
  #restoreFromHistory(visit) {
    let settled = false

    // Snapshot a teardown so cancelVisit() can abort this restore if a new
    // navigation interrupts it before popstate/fallback resolves.
    const cleanup = () => {
      settled = true
      clearTimeout(fallback)
      window.removeEventListener('popstate', onPopstate)
      if (this.#restoreCleanup === cleanup) this.#restoreCleanup = null
    }
    this.#restoreCleanup = cleanup

    const onPopstate = () => {
      if (settled) return
      cleanup()

      log('inertia', 'restore from history cache (no request)', { url: window.location.href })
      const adapter = this.adapter
      adapter?.visitRequestStarted(visit)
      adapter?.visitRequestCompleted(visit)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          adapter?.visitRendered(visit)
          adapter?.visitCompleted(visit)
          adapter?.visitRequestFinished(visit)
          this.#activeVisit = null
        })
      )
    }

    const fallback = setTimeout(() => {
      if (settled) return
      cleanup()
      log('inertia', 'restore: no cached entry → fresh request', { url: visit.location.href })
      // router.on(start/success/finish) drives the native lifecycle for #activeVisit.
      router.visit(visit.location.href, {
        replace: true,
        onCancelToken: (token) => {
          this.#cancelToken = token
        },
      })
    }, RESTORE_POPSTATE_TIMEOUT_MS)

    window.addEventListener('popstate', onPopstate)
    setTimeout(() => window.history.back(), 0)
  }

  changeHistory(_visit) {}
  loadCachedSnapshot(_visit) {}
  loadResponse(_visit) {}

  cancelVisit(_visit) {
    // Navigator#stop() cancels the previous visit before each new one. A restore
    // may still be waiting on popstate/fallback (no request in flight yet); tear
    // it down so its callbacks don't later fire for this abandoned visit.
    this.#restoreCleanup?.()

    // Only actually cancel if a request is still in flight; on back/restore the
    // previous visit has already finished (#activeVisit cleared), so this is a
    // no-op. There is no router.cancel() in @inertiajs/core — cancellation goes
    // through the per-visit token captured above.
    if (this.#activeVisit) {
      log('inertia', 'cancelVisit (in-flight)')
      try {
        this.#cancelToken?.cancel?.()
      } catch {
        // request already settled — nothing to cancel
      }
    }
    this.#cancelToken = null
    this.#activeVisit = null
  }

  hasCachedSnapshot(_visit) {
    return false
  }

  isPageRefresh(visit) {
    // A visit targeting the URL we're already on (pull-to-refresh, the
    // "Refresh" historical action) is a page refresh. The native side uses this
    // to skip the push animation and treat it as an in-place reload.
    return visit.location.href === window.location.href
  }

  // --- Inertia router events → native adapter ---

  #setupInertiaListeners() {
    router.on('before', (event) => {
      const { visit } = event.detail

      // A native-initiated visit is already in flight (we issued it): let it
      // proceed instead of proposing it again.
      if (this.#activeVisit) {
        log('inertia', 'before (native-initiated, passthrough)', { url: visit.url })
        return
      }

      // No native adapter (regular browser): normal Inertia navigation.
      if (!this.adapter) return

      // Form submissions stay in the webview (Inertia POSTs and follows the
      // redirect in place). We don't propose a native visit; the native side is
      // notified via formSubmissionStarted/Finished in the start/finish handlers.
      if (visit.method !== 'get') {
        log('inertia', 'before (form submission, passthrough)', { url: visit.url, method: visit.method })
        return
      }

      log('inertia', 'before → visitProposed', { url: visit.url, replace: visit.replace })
      event.preventDefault()
      this.session.visitProposedToLocation(new URL(visit.url, window.location.href), {
        action: visit.replace ? 'replace' : 'advance',
      })
    })

    router.on('start', (event) => {
      const { visit } = event.detail
      if (visit.method !== 'get') {
        log('inertia', 'form start → formSubmissionStarted', { url: visit.url })
        this.adapter?.formSubmissionStarted({ location: new URL(visit.url, window.location.href) })
        return
      }
      if (!this.#activeVisit) return
      log('inertia', 'start → visitRequestStarted', { id: this.#activeVisit.identifier })
      this.adapter?.visitRequestStarted(this.#activeVisit)
    })

    router.on('success', () => {
      if (!this.#activeVisit) return
      const visit = this.#activeVisit
      log('inertia', 'success → visitRequestCompleted', { id: visit.identifier })
      this.adapter?.visitRequestCompleted(visit)
      // Double rAF: report rendered/completed only after the new page paints.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          log('native', 'visitRendered + visitCompleted', { id: visit.identifier })
          this.adapter?.visitRendered(visit)
          this.adapter?.visitCompleted(visit)
        })
      )
    })

    // Non-Inertia / error HTTP response (404, 500, redirect to a non-Inertia
    // page). v3.4 renamed this event from `invalid` to `httpException`; we
    // listen for both so error screens work on @inertiajs/core 2.x–3.3 too.
    // A given core version only ever fires one of the two names.
    const onHttpException = (event) => {
      if (!this.#activeVisit) return
      const status = event.detail.response?.status ?? 0
      log('inertia', 'httpException → visitRequestFailedWithStatusCode', { status })
      // Suppress Inertia's default error overlay; the native side shows its own
      // error screen for the failed visit.
      event.preventDefault()
      this.adapter?.visitRequestFailedWithStatusCode(this.#activeVisit, status)
    }
    router.on('httpException', onHttpException)
    router.on('invalid', onHttpException)

    // Network-level failure (offline, timeout, DNS). v3.4 renamed this event
    // from `exception` to `networkError`; we listen for both. No HTTP status →
    // pass 0 so turbo.js routes it as a non-HTTP failure.
    const onNetworkError = () => {
      if (!this.#activeVisit) return
      log('inertia', 'networkError → visitRequestFailedWithStatusCode(0)')
      this.adapter?.visitRequestFailedWithStatusCode(this.#activeVisit, 0)
    }
    router.on('networkError', onNetworkError)
    router.on('exception', onNetworkError)

    router.on('finish', (event) => {
      const { visit } = event.detail
      if (visit.method !== 'get') {
        log('inertia', 'form finish → formSubmissionFinished', { url: visit.url })
        this.adapter?.formSubmissionFinished({ location: new URL(visit.url, window.location.href) })
        return
      }
      if (!this.#activeVisit) return
      log('inertia', 'finish → visitRequestFinished', { id: this.#activeVisit.identifier })
      this.adapter?.visitRequestFinished(this.#activeVisit)
      this.#activeVisit = null
    })
  }
}
