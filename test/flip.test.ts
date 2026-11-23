import { afterEach, describe, expect, test } from 'bun:test'
import * as flip from '../src/flip.ts'

type Rect = { left: number; top: number; width: number; height: number }
type Call = { keyframes: Keyframe[]; options: KeyframeEffectOptions }

const matchMedia = window.matchMedia

function tagged(key: string, rect: Rect): HTMLElement {
	const el = document.createElement('figure')
	el.setAttribute('data-flip', key)
	el.getBoundingClientRect = () =>
		({ ...rect, right: 0, bottom: 0, x: rect.left, y: rect.top, toJSON: () => {} }) as DOMRect
	return el
}

function recording(el: HTMLElement): Call[] {
	const calls: Call[] = []
	Object.assign(el, {
		animate(keyframes: Keyframe[], options: KeyframeEffectOptions) {
			calls.push({ keyframes, options })
			return { finished: Promise.resolve() }
		},
	})
	return calls
}

const OLD: Rect = { left: 100, top: 40, width: 80, height: 60 }
const NEW: Rect = { left: 0, top: 0, width: 160, height: 60 }

/** A leaving page holding `old`, an entering page holding `fresh`. */
function swap(old: HTMLElement, fresh: HTMLElement) {
	const leaving = document.createElement('div')
	const entering = document.createElement('div')
	leaving.append(old)
	entering.append(fresh)
	document.body.append(leaving, entering)
	return { leaving, entering }
}

afterEach(() => {
	flip.clear()
	document.body.replaceChildren()
	window.matchMedia = matchMedia
})

describe('flip', () => {
	test('capture records tagged elements with a key and returns their count', () => {
		const { leaving } = swap(tagged('cover', OLD), tagged('', NEW))
		expect(flip.capture(leaving)).toBe(1)
		expect(flip.capture(leaving)).toBe(1)
	})

	test('play without a capture is a no-op', async () => {
		const { entering } = swap(tagged('cover', OLD), tagged('cover', NEW))
		await expect(flip.play(entering)).resolves.toBe(0)
	})

	test('play moves a pair from the old rect and hides the outgoing copy', async () => {
		const old = tagged('cover', OLD)
		const fresh = tagged('cover', NEW)
		const calls = recording(fresh)
		const { leaving, entering } = swap(old, fresh)

		flip.capture(leaving)
		await expect(flip.play(entering)).resolves.toBe(1)

		expect(calls).toHaveLength(1)
		const [from, to] = calls[0]!.keyframes as Record<string, string>[]
		expect(from.transform).toBe('translate(100px, 40px) scale(0.5, 1)')
		expect(from.transformOrigin).toBe('0 0')
		expect(to.transform).toBe('none')
		expect(old.style.visibility).toBe('hidden')
		expect(fresh.style.visibility).toBe('')
	})

	test('a second play has nothing left to move', async () => {
		const fresh = tagged('cover', NEW)
		const { leaving, entering } = swap(tagged('cover', OLD), fresh)
		flip.capture(leaving)
		await flip.play(entering)
		await expect(flip.play(entering)).resolves.toBe(0)
	})

	test('unpaired keys are left alone', async () => {
		const old = tagged('a', OLD)
		const fresh = tagged('b', NEW)
		const seen = recording(fresh)
		const { leaving, entering } = swap(old, fresh)
		flip.capture(leaving)
		await expect(flip.play(entering)).resolves.toBe(0)
		expect(old.style.visibility).toBe('')
		expect(seen).toHaveLength(0)
	})

	test('scale: false keeps the element at its final size', async () => {
		const fresh = tagged('cover', NEW)
		const seen = recording(fresh)
		const { leaving, entering } = swap(tagged('cover', OLD), fresh)
		flip.capture(leaving)
		await flip.play(entering, { scale: false })
		expect((seen[0]!.keyframes as Record<string, string>[])[0]!.transform).toBe(
			'translate(100px, 40px) scale(1, 1)',
		)
	})

	test('hidePrevious: false leaves the outgoing copy visible', async () => {
		const old = tagged('cover', OLD)
		const { leaving, entering } = swap(old, tagged('cover', NEW))
		flip.capture(leaving)
		await flip.play(entering, { hidePrevious: false })
		expect(old.style.visibility).toBe('')
	})

	test('clear() drops what capture recorded', async () => {
		const { leaving, entering } = swap(tagged('cover', OLD), tagged('cover', NEW))
		flip.capture(leaving)
		flip.clear()
		expect(flip.peek(entering)).toBe(0)
		await expect(flip.play(entering)).resolves.toBe(0)
	})

	test('peek counts pairs without consuming the capture', () => {
		const { leaving, entering } = swap(tagged('cover', OLD), tagged('cover', NEW))
		flip.capture(leaving)
		expect(flip.peek(entering)).toBe(1)
		expect(flip.peek(entering)).toBe(1)
		expect(flip.peek(leaving)).toBe(1)
	})

	test('reduced motion records nothing and moves nothing', async () => {
		window.matchMedia = ((query: string) => ({ matches: true, media: query })) as unknown as typeof matchMedia
		const old = tagged('cover', OLD)
		const { leaving, entering } = swap(old, tagged('cover', NEW))
		expect(flip.capture(leaving)).toBe(0)
		await expect(flip.play(entering)).resolves.toBe(0)
		expect(old.style.visibility).toBe('')
	})
})
