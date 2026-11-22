/**
 * Respects the user's motion preference. Every preset and `settle` checks
 * this first — reduced motion means the router still transitions (the
 * dual-tree swap is structural), just without decorating it.
 */
export function reduced(): boolean {
	return (
		typeof window !== 'undefined'
		&& window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
	)
}

/**
 * Resolve when `el` finishes a CSS transition, bounded by a timeout — the
 * standard settle recipe for router transitions. Resolves on whichever
 * happens first: `transitionend`, or `ms + 80` (cancelled tabs, reduced
 * motion, interrupted transitions never fire the event).
 */
export function settle(el: HTMLElement, ms: number): Promise<void> {
	if (reduced() || ms <= 0) return Promise.resolve()
	return new Promise((resolve) => {
		let done = false
		const finish = () => {
			if (done) return
			done = true
			clearTimeout(timer)
			resolve()
		}
		const timer = setTimeout(finish, ms + 80)
		el.addEventListener('transitionend', finish, { once: true })
	})
}

/**
 * Run a WAAPI animation and resolve on `finished`, with guards for
 * environments without `Element.animate` (SSR, test DOMs) and reduced
 * motion. Never throws: a failed animation resolves, it does not reject —
 * a broken animation must not strand the router's dual tree.
 */
export async function played(
	el: HTMLElement,
	keyframes: Keyframe[],
	options: number | KeyframeAnimationOptions,
): Promise<void> {
	if (reduced() || typeof el.animate !== 'function') {
		return Promise.resolve()
	}
	const animation = el.animate(keyframes, options)
	try {
		await animation.finished
	} catch {
		// A cancelled/failed animation resolves — it must not strand the
		// router's dual tree.
	}
}
