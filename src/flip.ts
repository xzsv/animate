import { played, reduced } from './settle.ts'

/**
 * FLIP (First, Last, Invert, Play) for elements that persist across a
 * route swap: a list thumbnail becoming the page header, a title moving
 * into the bar. Bare by design — `capture()` records where tagged elements
 * are right before the swap, `play()` moves their successors there after
 * it. Nothing here knows about routes.
 *
 * Tag elements with `data-flip="<key>"`. Two elements sharing a key on
 * opposite sides of a swap form a pair; anything unpaired is left alone.
 * Paired elements must not carry a transform of their own while a pair
 * plays, and `play()` pins `transform-origin` to `0 0` for the duration.
 */

export type FlipOptions = {
	/** Animation length in ms. Default 280. */
	duration?: number
	/** CSS easing. Default `'cubic-bezier(0.22, 1, 0.36, 1)'`. */
	easing?: string
	/**
	 * Animate size changes too. Default `true`; `false` keeps the element
	 * at its final size and only moves it.
	 */
	scale?: boolean
	/**
	 * Hide the outgoing copy as soon as its pair starts moving, so two
	 * copies never show at once. Default `true`.
	 */
	hidePrevious?: boolean
}

type Captured = { el: Element; rect: DOMRect }

/** Key → outgoing element and its rect. One capture/play cycle per swap. */
const outgoing = new Map<string, Captured>()

const SELECTOR = '[data-flip]'
const keyOf = (el: Element): string => el.getAttribute('data-flip') ?? ''

/**
 * Record the current rects of every tagged element under `root`. Call it
 * synchronously before the DOM changes — first thing in a router `leave`
 * callback, ahead of any style write that lifts the page out of flow.
 * Returns how many elements were recorded (0 under reduced motion).
 */
export function capture(root: ParentNode = document): number {
	if (reduced()) return 0
	let count = 0
	for (const el of root.querySelectorAll(SELECTOR)) {
		const key = keyOf(el)
		if (!key) continue
		outgoing.set(key, { el, rect: el.getBoundingClientRect() })
		count++
	}
	return count
}

/**
 * How many tagged elements under `root` have a captured counterpart right
 * now. Synchronous and non-consuming — lets an `enter` callback choose
 * between a FLIP and a plain transition before committing.
 */
export function peek(root: ParentNode = document): number {
	if (reduced() || outgoing.size === 0) return 0
	const keys = new Set(outgoing.keys())
	let count = 0
	for (const el of root.querySelectorAll(SELECTOR)) {
		if (keys.has(keyOf(el))) count++
	}
	return count
}

/**
 * Move every tagged element under `root` to where its captured counterpart
 * was, then animate it to its real place. Call it once the new DOM is in
 * its final layout (after a tick), while the container itself is still.
 * Resolves when every pair has landed; returns how many pairs moved.
 */
export async function play(root: ParentNode = document, options: FlipOptions = {}): Promise<number> {
	if (outgoing.size === 0) return 0
	const pending = [...outgoing.values()]
	outgoing.clear()
	if (reduced()) return 0
	const duration = options.duration ?? 280
	const easing = options.easing ?? 'cubic-bezier(0.22, 1, 0.36, 1)'
	const scale = options.scale ?? true
	const jobs: Promise<void>[] = []
	for (const el of root.querySelectorAll(SELECTOR)) {
		const key = keyOf(el)
		const prev = pending.find((entry) => keyOf(entry.el) === key)
		if (!key || !prev || prev.el === el) continue
		const first = prev.rect
		const last = el.getBoundingClientRect()
		if (options.hidePrevious !== false && prev.el instanceof HTMLElement) {
			prev.el.style.visibility = 'hidden'
		}
		const sx = scale && last.width > 0 ? first.width / last.width : 1
		const sy = scale && last.height > 0 ? first.height / last.height : 1
		// Scaling from the top-left keeps the corner offsets exact.
		const from = `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${sx}, ${sy})`
		jobs.push(
			played(
				el as HTMLElement,
				[
					{ transformOrigin: '0 0', transform: from },
					{ transformOrigin: '0 0', transform: 'none' },
				],
				{ duration, easing },
			),
		)
	}
	await Promise.all(jobs)
	return jobs.length
}

/** Forget everything `capture()` recorded — a navigation cancelled before `play()`. */
export function clear(): void {
	outgoing.clear()
}
