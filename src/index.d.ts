// Public types for the framework-agnostic core entry (`inertia-hotwire-native`).
// Importing from here also activates the global augmentation in globals.d.ts
// (so `window.Turbo`, `window.HotwireNative`, `window.webkit` are typed).
import type { BridgeMessage } from './globals.js'

export interface InitHotwireNativeOptions {
  /**
   * Log the web↔native message flow to the webview console (attach Safari Web
   * Inspector to see it). Off by default.
   */
  debug?: boolean
}

/**
 * Install the `window.Turbo` shim that Hotwire Native's injected `turbo.js`
 * drives. Call once, before `createInertiaApp`. In a regular browser it stays
 * inert and Inertia navigates as usual.
 */
export function initHotwireNative(options?: InitHotwireNativeOptions): void

export type { BridgeMessage }
