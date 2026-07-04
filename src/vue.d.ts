// Public types for the Vue entry (`inertia-hotwire-native/vue`).
import type { Ref } from 'vue'
import type { BridgeMessage } from './globals.js'

export type { BridgeMessage }

export interface BridgeComponent {
  /** Whether the connected native app supports this bridge component. */
  supported: Ref<boolean>
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
 * Generic Vue composable over the web bridge core (`window.HotwireNative.web`).
 * `supported` re-checks when the native handshake completes after mount.
 */
export function useBridgeComponent(component: string): BridgeComponent
