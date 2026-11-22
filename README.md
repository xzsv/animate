# @xzsv/animate

Transition presets and settle plumbing for [`@xzsv/router`](https://github.com/xzsv/router).

The router orchestrates route animations: it dispatches `enter`/`leave`
callbacks to registered `routeNode` elements — but only past the equality
point, so persistent layouts never animate — holds both trees mounted
until the callbacks settle, and bounds the wait with `timeoutMs`. This
package supplies what goes _inside_ those callbacks, so you stop
copy-pasting the settle recipe between apps.

```ts
import { slide } from '@xzsv/animate'
import { createRouter } from '@xzsv/router'

export const router = createRouter({
	routes: {
		layout: Shell,
		'/': Home,
		'/about': () => import('./pages/About.svelte'),
	},
	transitions: { ...slide({ distance: 24 }), timeoutMs: 600 },
})
```

## What's here

- `settle(el, ms)` — resolve on `transitionend`, bounded by a `ms + 80`
  timeout (interrupted transitions never fire the event).
- `reduced()` — `prefers-reduced-motion` guard; presets skip decoration
  but the structural dual-tree swap still happens.
- `played(el, keyframes, options)` — WAAPI helper that never rejects; a
  broken animation must not strand the router mid-transition.
- Presets: `crossfade()`, `slide()`, `lift()`, `scale()` — each returns
  `{ enter, leave }` pairs matching the router's `TransitionFn`. Leaves
  lift out of flow (absolute + `width: 100%`) so both trees genuinely
  cross-fade instead of stacking.

## Out of scope

No engine features. For timelines, staggers, or SVG work, import
[`animejs`](https://animejs.com) (v4, MIT) _inside_ your own enter/leave
callbacks and return the finished promise — this package stays a ~1kB,
tree-shakeable, source-shipped set of functions.

## Status

Source-shipping: the npm export points at `./src/index.ts` and your own
Svelte/Vite toolchain compiles it (same model as `@xzsv/router` and
`@xzsv/load`).
