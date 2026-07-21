# Inertia Hotwire Native

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
- **Vue bindings** (`./vue`) — optional, peer-depends on `vue`.
- **Svelte bindings** (`./svelte`) — optional, peer-depends on `svelte`.

## Install

> **Beta.** This is a pre-1.0 release published under the `beta` tag; the API
> may still change.

```bash
npm add inertia-hotwire-native@beta
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

### Bridge components (Vue)

The Vue entry exposes the same `useBridgeComponent(name)` composable. `supported`
is a `Ref`, so unwrap it with `.value` (or `v-if` in a template); `send` has the
same signature.

```vue
<script setup>
import { useBridgeComponent } from 'inertia-hotwire-native/vue'

const props = defineProps(['items'])
const { supported, send } = useBridgeComponent('menu')

function open() {
  send('connect', { items: props.items }, (message) => onSelect(message.data.index))
}
</script>

<template>
  <button v-if="supported" @click="open">Open menu</button>
</template>
```

### Bridge components (Svelte)

The Svelte entry exposes `useBridgeComponent(name)` too. `supported` is a
readable store (subscribe with `$supported`); `send` has the same signature.
Call it during component initialization — it registers an `onDestroy` cleanup.

```svelte
<script>
  import { useBridgeComponent } from 'inertia-hotwire-native/svelte'

  export let items
  const { supported, send } = useBridgeComponent('menu')

  const open = () =>
    send('connect', { items }, (message) => onSelect(message.data.index))
</script>

{#if $supported}
  <button on:click={open}>Open menu</button>
{/if}
```

## Requirements

- `@inertiajs/core` >= 2.0 (works with the v3 line)
- `react` >= 18 (only for the `./react` entry)
- `vue` >= 3.0 (only for the `./vue` entry)
- `svelte` >= 4.0 (only for the `./svelte` entry)

## License

MIT
