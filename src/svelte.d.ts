// Public types for the Svelte entry (`inertia-hotwire-native/svelte`).
import type { Readable } from 'svelte/store'
import type { BridgeMessage } from './globals.js'

export type { BridgeMessage }

export interface BridgeComponent {
  /** Whether the connected native app supports this bridge component. */
  supported: Readable<boolean>
  /**
   * Send a message to native. Returns the message id (for callback cleanup),
   * or `null` if it was queued or the component is unsupported.
   */
  send(
    event: string,
    data?: Record<string, unknown>,
    callback?: (message: BridgeMessage) => void,
  ): string | null
}

/**
 * Generic Svelte helper over the web bridge core (`window.HotwireNative.web`).
 * `supported` re-checks when the native handshake completes after mount. Call
 * during component initialization (it registers an `onDestroy` cleanup).
 */
export function useBridgeComponent(component: string): BridgeComponent
