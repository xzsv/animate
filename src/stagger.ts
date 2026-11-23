import { played, reduced } from './settle.ts'

export type StaggerOptions = {
	/** Wait before the first element, in ms. Default 0. */
	delay?: number
	/** Extra wait per element, in ms. Default 40. */
	step?: number
	/** Animation length per element, in ms. Default 220. */
	duration?: number
	/** Rise distance in px. Default 12; `0` fades in place. */
	distance?: number
	/** CSS easing. Default `'ease-out'`. */
	easing?: string
	/**
	 * Steps after which elements share the last delay, so a long list does
	 * not trail off for seconds. Default 12.
	 */
	maxSteps?: number
}

type Target = string | Element[] | NodeListOf<Element> | HTMLCollectionOf<Element>

/**
 * Reveal elements one after another: each rises `distance` px while fading
 * in, the nth waiting `delay + n × step`. `fill: 'backwards'` holds every
 * element at its first keyframe until its turn, so nothing flashes and no
 * inline style is written. Without WAAPI, or under reduced motion, the
 * elements simply stay visible. Resolves when the last one has landed.
 *
 * Targets must not carry a transform of their own while the reveal plays.
 */
export async function stagger(
	target: Target,
	options: StaggerOptions & { root?: ParentNode } = {},
): Promise<void> {
	if (reduced()) return
	const els = [
		...new Set(typeof target === 'string' ? (options.root ?? document).querySelectorAll(target) : target),
	]
	const step = options.step ?? 40
	const maxSteps = options.maxSteps ?? 12
	await Promise.all(
		els.map((el, index) =>
			played(
				el as HTMLElement,
				[
					{ opacity: 0, transform: `translateY(${options.distance ?? 12}px)` },
					{ opacity: 1, transform: 'translateY(0)' },
				],
				{
					duration: options.duration ?? 220,
					easing: options.easing ?? 'ease-out',
					delay: (options.delay ?? 0) + Math.min(index, maxSteps) * step,
					fill: 'backwards',
				},
			),
		),
	)
}
