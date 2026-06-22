# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta.0] — 2026-06-22

First public beta. Pre-1.0, the API may still change.

### Added

- `initHotwireNative()` — installs the `window.Turbo` shim that Hotwire Native's
  injected `turbo.js` drives, mapping the native adapter protocol onto Inertia's
  router (push/pop/replace/restore, modals, forms, error screens,
  pull-to-refresh). Inert in a regular browser.
- Web bridge runtime (`window.HotwireNative.web`) for native bridge components.
- React bindings (`inertia-hotwire-native/react`): `useBridgeComponent(name)`.
- Hand-written TypeScript declarations and a type-level test.
- Compatible with `@inertiajs/core` `>=2.0` (handles both the current and
  pre-3.4 router event names).
