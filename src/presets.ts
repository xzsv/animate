import type { RouteNodeInfo, TransitionFn } from '@xzsv/router'
import { played, reduced, settle } from './settle.ts'

export type PresetOptions = {
	/** Animation length in ms. Default 220 — the Kana Dojo constant. */
	duration?: number
}

type Preset = { enter: TransitionFn; leave: TransitionFn }

/**
 * Lift the leaving page out of flow so both trees genuinely cross-fade
 * in place instead of stacking. Every `leave` here does the same move:
 * absolute + top/left 0 + width 100% (the parent must be positioned),
 * then animate out, then clear the escape styles.
 */
function leaveOf(
	duration: number,
	easing: string,
	keyframes: (el: HTMLElement, info: RouteNodeInfo) => Keyframe[],
): TransitionFn {
	return async (el, info) => {
		Object.assign(el.style, {
			position: 'absolute',
			top: '0',
			left: '0',
			width: '100%',
		})
		await played(el, keyframes(el, info), { duration, easing })
		Object.assign(el.style, {
			position: '',
			top: '',
			left: '',
			width: '',
		})
	}
}

/** Both trees visible, old fades out under the new fading in. */
export function crossfade(options: PresetOptions = {}): Preset {
	const duration = options.duration ?? 220
	return {
		enter: async (el) => {
			await played(el, [{ opacity: 0 }, { opacity: 1 }], { duration, easing: 'ease-out' })
		},
		leave: leaveOf(duration, 'ease-out', () => [{ opacity: 1 }, { opacity: 0 }]),
	}
}

/**
 * Directional slide. Without `order` it is the 0.1.x symmetric vertical
 * drift. Give it an `order(path)` rank and direction flips with the
 * navigation: `order(to) >= order(from)` slides forward, a lower rank
 * reverses both pages. `axis` picks the plane (default `'y'`, use `'x'`
 * for hub-to-arena moves). This is the shape Ember Circuit hand-rolls
 * with its `rank()` helper.
 */
export function slide(
	options: PresetOptions & {
		/** Slide distance in px. Default 24. */
		distance?: number
		/** Translation plane. Default `'y'`. */
		axis?: 'x' | 'y'
		/** CSS easing for the transition. Default `'ease-out'`. */
		easing?: string
		/**
		 * Direction rank: a comparable position per path. `order(to)` at
		 * least `order(from)` slides forward; lower reverses. Without it
		 * the slide always plays forward.
		 */
		order?: (path: string) => number
	} = {},
): Preset {
	const duration = options.duration ?? 220
	const distance = options.distance ?? 24
	const axis = options.axis ?? 'y'
	const easing = options.easing ?? 'ease-out'
	const order = options.order
	const translate = (px: number) => axis === 'x' ? `translateX(${px}px)` : `translateY(${px}px)`
	const forward = (info: RouteNodeInfo) => !order || order(info.to) >= order(info.from)
	return {
		enter: async (el, info) => {
			if (reduced()) return
			const offset = forward(info) ? distance : -distance
			el.style.opacity = '0'
			el.style.transform = translate(offset)
			void el.offsetWidth
			el.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`
			el.style.opacity = '1'
			el.style.transform = translate(0)
			await settle(el, duration)
			el.style.transition = ''
		},
		leave: leaveOf(duration, easing, (el, info) => [
			{ opacity: 1, transform: translate(0) },
			{ opacity: 0, transform: translate(forward(info) ? -distance : distance) },
		]),
	}
}

/** New content rises from slightly below with a fade. */
export function lift(options: PresetOptions = {}): Preset {
	const duration = options.duration ?? 220
	return {
		enter: async (el) => {
			await played(
				el,
				[{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
				{ duration, easing: 'ease-out' },
			)
		},
		leave: leaveOf(duration, 'ease-out', () => [{ opacity: 1 }, { opacity: 0 }]),
	}
}

/** Quiet pop: scale from 0.98 under a fade. */
export function scale(options: PresetOptions = {}): Preset {
	const duration = options.duration ?? 220
	return {
		enter: async (el) => {
			await played(
				el,
				[{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'scale(1)' }],
				{ duration, easing: 'ease-out' },
			)
		},
		leave: leaveOf(duration, 'ease-out', () => [{ opacity: 1 }, { opacity: 0 }]),
	}
}
