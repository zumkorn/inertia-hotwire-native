# inertia-hotwire-native

[![CI](https://github.com/zumkorn/inertia-hotwire-native/actions/workflows/ci.yml/badge.svg)](https://github.com/zumkorn/inertia-hotwire-native/actions/workflows/ci.yml)

Drive [Inertia.js](https://inertiajs.com) navigation and bridge components from
[Hotwire Native](https://native.hotwired.dev) (iOS & Android).

Hotwire Native injects a `turbo.js` script into every web view that expects a
`window.Turbo` object to drive. This package provides a small shim that maps the
native adapter protocol onto Inertia's router, so Inertia pages push, pop, and
restore as native screens — and a web bridge so Inertia pages can use native
bridge components (submit buttons, menus, etc.).

In a regular browser it stays inert: with no native adapter connected, Inertia
navigates exactly as usual.

- **Framework-agnostic core** (`.`) — peer-depends on `@inertiajs/core`.
- **React bindings** (`./react`) — optional, peer-depends on `react`.

## Install

```bash
npm add inertia-hotwire-native
```

## Usage

Call `initHotwireNative()` once, before `createInertiaApp`, in your Inertia
entrypoint:

```js
import { createInertiaApp } from '@inertiajs/react'
import { initHotwireNative } from 'inertia-hotwire-native'

const isHotwireNative = !!window.webkit?.messageHandlers?.turbo
initHotwireNative({ debug: import.meta.env.DEV || isHotwireNative })

createInertiaApp({ /* ... */ })
```

That's all that's needed for native navigation (push/pop/replace/restore,
modals, forms, error screens, pull-to-refresh).

### Bridge components (React)

`useBridgeComponent(name)` is the generic primitive: it returns whether the
connected native app supports the component and a stable `send(event, data?,
callback?)`. Build specific components (`form`, `menu`, `overflow-menu`, …) in
your app on top of it.

```jsx
import { useBridgeComponent } from 'inertia-hotwire-native/react'

function NativeMenu({ items }) {
  const { supported, send } = useBridgeComponent('menu')
  if (!supported) return null

  return (
    <button
      onClick={() =>
        send('connect', { items }, (message) => onSelect(message.data.index))
      }
    >
      Open menu
    </button>
  )
}
```

Each `send` returns a message id; native replies invoke the `callback`. The
hook re-checks support when the native handshake completes after mount.

## Requirements

- `@inertiajs/core` >= 2.0 (works with the v3 line)
- `react` >= 18 (only for the `./react` entry)

## License

MIT
