import type { TransitionFn } from '@xzsv/router'
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
	keyframes: (el: HTMLElement) => Keyframe[],
): TransitionFn {
	return async (el) => {
		Object.assign(el.style, {
			position: 'absolute',
			top: '0',
			left: '0',
			width: '100%',
		})
		await played(el, keyframes(el), { duration, easing: 'ease-out' })
		Object.assign(el.style, {
			position: '',
			top: '',
			left: '',
			width: '',
		})
		await settle(el, 0)
	}
}

/** Both trees visible, old fades out under the new fading in. */
export function crossfade(options: PresetOptions = {}): Preset {
	const duration = options.duration ?? 220
	return {
		enter: async (el) => {
			await played(el, [{ opacity: 0 }, { opacity: 1 }], { duration, easing: 'ease-out' })
			await settle(el, duration)
		},
		leave: leaveOf(duration, () => [{ opacity: 1 }, { opacity: 0 }]),
	}
}

/**
 * Crossfade with vertical drift. `direction` is your call per navigation
 * (compare `info.from`/`info.to`, or wire a stack) — the preset stays
 * symmetric and dumb on purpose.
 */
export function slide(
	options: PresetOptions & { distance?: number } = {},
): Preset {
	const duration = options.duration ?? 220
	const distance = options.distance ?? 24
	return {
		enter: async (el) => {
			if (reduced()) return
			el.style.opacity = '0'
			el.style.transform = `translateY(${distance}px)`
			void el.offsetWidth
			el.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`
			el.style.opacity = '1'
			el.style.transform = 'translateY(0)'
			await settle(el, duration)
			el.style.transition = ''
		},
		leave: leaveOf(duration, (el) => [
			{ opacity: 1, transform: 'translateY(0)' },
			{ opacity: 0, transform: `translateY(-${distance}px)` },
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
			await settle(el, duration)
		},
		leave: leaveOf(duration, () => [{ opacity: 1 }, { opacity: 0 }]),
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
			await settle(el, duration)
		},
		leave: leaveOf(duration, () => [{ opacity: 1 }, { opacity: 0 }]),
	}
}
