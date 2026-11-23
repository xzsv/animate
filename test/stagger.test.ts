import { afterEach, describe, expect, test } from 'bun:test'
import { stagger } from '../src/stagger.ts'

type Call = { keyframes: Keyframe[]; options: KeyframeEffectOptions }

const matchMedia = window.matchMedia

function items(count: number): HTMLElement[] {
	return Array.from({ length: count }, (_, index) => {
		const el = document.createElement('li')
		el.setAttribute('data-task', '')
		el.textContent = `task ${index}`
		document.body.append(el)
		return el
	})
}

function recording(els: HTMLElement[]): Call[] {
	const calls: Call[] = []
	for (const el of els) {
		Object.assign(el, {
			animate(keyframes: Keyframe[], options: KeyframeEffectOptions) {
				calls.push({ keyframes, options })
				return { finished: Promise.resolve() }
			},
		})
	}
	return calls
}

afterEach(() => {
	document.body.replaceChildren()
	window.matchMedia = matchMedia
})

describe('stagger', () => {
	test('resolves without WAAPI and writes no inline style', async () => {
		const els = items(3)
		await expect(stagger('[data-task]')).resolves.toBeUndefined()
		for (const el of els) {
			expect(el.style.opacity).toBe('')
			expect(el.style.transform).toBe('')
		}
	})

	test('delays grow by step and stop at maxSteps', async () => {
		const els = items(5)
		const calls = recording(els)
		await stagger(els, { delay: 5, step: 10, maxSteps: 2 })
		expect(calls.map((call) => call.options.delay)).toEqual([5, 15, 25, 25, 25])
	})

	test('holds every element hidden until its turn', async () => {
		const els = items(2)
		const calls = recording(els)
		await stagger(els)
		for (const call of calls) {
			const [from, to] = call.keyframes as Record<string, string>[]
			expect(from.opacity).toBe(0)
			expect(from.transform).toBe('translateY(12px)')
			expect(to.opacity).toBe(1)
			expect(to.transform).toBe('translateY(0)')
			expect(call.options.fill).toBe('backwards')
		}
	})

	test('a selector resolves against root', async () => {
		const els = items(2)
		const calls = recording(els)
		await stagger('[data-task]', { root: document.body })
		expect(calls).toHaveLength(2)
	})

	test('reduced motion reveals everything at once', async () => {
		window.matchMedia = ((query: string) => ({ matches: true, media: query })) as unknown as typeof matchMedia
		const els = items(3)
		const calls = recording(els)
		await stagger(els)
		expect(calls).toHaveLength(0)
	})
})
