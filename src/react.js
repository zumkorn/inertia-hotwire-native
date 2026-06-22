import { useCallback, useEffect, useRef, useState } from 'react'

// Generic React wrapper over the web bridge core (window.HotwireNative.web).
// Returns whether the native app supports `component` and a stable `send`.
export function useBridgeComponent(component) {
  const [supported, setSupported] = useState(
    () => !!window.HotwireNative?.web?.supportsComponent(component)
  )
  const sentIds = useRef([])

  useEffect(() => {
    const check = () =>
      setSupported(!!window.HotwireNative?.web?.supportsComponent(component))
    check()
    // Native support can arrive after mount (async handshake); the bridge writes
    // data-bridge-components on <html>, so observe it and re-check.
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-bridge-components'],
    })
    return () => observer.disconnect()
  }, [component])

  const send = useCallback(
    (event, data = {}, callback) => {
      const web = window.HotwireNative?.web
      if (!web) return null
      const id = web.send({
        component,
        event,
        data: { ...data, metadata: { url: window.location.href } },
        callback,
      })
      if (id) sentIds.current.push(id)
      return id
    },
    [component]
  )

  useEffect(() => {
    const ids = sentIds.current
    return () => {
      const web = window.HotwireNative?.web
      ids.forEach((id) => web?.removeCallback(id))
      web?.removePendingMessagesFor(component)
    }
  }, [component])

  return { supported, send }
}
