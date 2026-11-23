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
  cross-fade instead of stacking. `slide()` takes `axis` (`'x'`/`'y'`),
  `easing`, and an `order(path)` rank: `order(to) >= order(from)` slides
  forward, a lower rank reverses both pages — screen order is the single
  source of direction.

```ts
const transitions = slide({
	axis: 'x',
	distance: 32,
	duration: 260,
	order: (p) => ({ '/': 0, '/hub': 1, '/battle': 2 })[p] ?? 1,
})
```

- `stagger(target, options)` — reveal a list one item after another. Each
  item rises `distance` px while fading in; the nth waits
  `delay + n × step` (steps stop growing at `maxSteps`). `fill: 'backwards'`
  holds every item at its first keyframe until its turn, so nothing
  flashes and no inline style is written. Without WAAPI, or under reduced
  motion, items simply stay visible.
- `flip.capture()` / `flip.peek(root)` / `flip.play(root, options)` /
  `flip.clear()` — shared-element (FLIP) transitions: a list card becoming
  the page header, a title moving into the bar. Tag both sides with
  `data-flip="<key>"`; equal keys form a pair, unpaired tags are ignored.
  `capture()` records rects while the old DOM is untouched, `play()` moves
  the new element from the old rect to its real place and hides the
  outgoing copy. `peek()` is synchronous and non-consuming, so an `enter`
  callback can choose between a FLIP and a plain preset. No-ops under
  reduced motion or without WAAPI. Paired elements must not carry a
  transform of their own while a pair plays.

```ts
import { crossfade, flip, slide, stagger } from '@xzsv/animate'

const fade = crossfade()
const page = slide({ axis: 'x' })
const TASKS = '[data-stagger] > *'

const router = createRouter({
	routes: {
		// Capture before anything lifts the old page out of flow.
		hooks: { beforeLoad: ({ from, to }) => flip.capture() },
		// ...
	},
	transitions: {
		enter: async (el, info) => {
			if (flip.peek(el) > 0) await flip.play(el, { duration: 360 })
			else await page.enter(el, info)
			await stagger(TASKS, { root: el, step: 40 })
		},
		leave: fade.leave,
	},
})
```

## Out of scope

No engine features. For timelines, SVG or path work, or easing curves
beyond what CSS accepts, import
[`animejs`](https://animejs.com) (v4, MIT) _inside_ your own enter/leave
callbacks and return the finished promise — this package stays a small,
tree-shakeable, source-shipped set of functions.

## Status

Source-shipping: the npm export points at `./src/index.ts` and your own
Svelte/Vite toolchain compiles it (same model as `@xzsv/router` and
`@xzsv/load`).
