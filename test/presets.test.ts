import { describe, expect, test } from 'bun:test'
import { crossfade, lift, scale, slide } from '../src/presets.ts'

const el = (): HTMLElement => {
	const node = document.createElement('div')
	document.body.append(node)
	return node
}

const info = (from: string, to: string) => ({ depth: 1, key: 0, from, to, navigationId: 1 })

for (
	const [name, preset] of Object.entries({
		crossfade: crossfade(),
		slide: slide(),
		lift: lift(),
		scale: scale(),
	}) as const
) {
	test(`${name} enter resolves without WAAPI and without throwing`, async () => {
		const node = el()
		await expect(preset.enter(node, info('/', '/x'))).resolves.toBeUndefined()
	})

	test(`${name} leave resolves and clears the out-of-flow styles`, async () => {
		const node = el()
		await preset.leave(node, info('/', '/x'))
		expect(node.style.position).toBe('')
		expect(node.style.width).toBe('')
	})
}

test('slide enter drifts the element via CSS transition and resets it', async () => {
	const node = el()
	const preset = slide({ distance: 10, duration: 30 })
	await preset.enter(node, info('/', '/x'))
	// happy-dom normalizes transform values, so the final state reads `0px`.
	expect(node.style.transform).toBe('translateY(0px)')
	expect(node.style.transition).toBe('')
})

/** Shadow the style transform accessor to record every value written. */
const recordTransforms = (node: HTMLElement): string[] => {
	const seen: string[] = []
	const desc = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'transform')
	Object.defineProperty(node.style, 'transform', {
		get: () => (desc?.get ? desc.get.call(node.style) : ''),
		set: (v: string) => {
			seen.push(v)
			desc?.set?.call(node.style, v)
		},
	})
	return seen
}

test('slide direction follows the order rank', async () => {
	const order = (path: string) => path === '/deep' ? 2 : 1
	const preset = slide({ distance: 24, axis: 'x', order, duration: 30 })

	// Enter choreography writes the offsets synchronously before settling:
	// forward nav starts from +x, reversed nav from −x.
	const aheadNode = el()
	const aheadWrites = recordTransforms(aheadNode)
	await preset.enter(aheadNode, info('/a', '/deep'))
	expect(aheadWrites.filter((v) => v.startsWith('translateX'))).toEqual([
		'translateX(24px)',
		'translateX(0px)',
	])

	const backNode = el()
	const backWrites = recordTransforms(backNode)
	await preset.enter(backNode, info('/deep', '/a'))
	expect(backWrites.filter((v) => v.startsWith('translateX'))).toEqual([
		'translateX(-24px)',
		'translateX(0px)',
	])

	// Leave keyframes mirror the direction.
	const leaveFrames = async (from: string, to: string): Promise<Keyframe[]> => {
		const node = el()
		let frames: Keyframe[] = []
		node.animate = ((f: Keyframe[]) => {
			frames = f
			return { finished: Promise.resolve() }
		}) as unknown as typeof node.animate
		await preset.leave(node, info(from, to))
		return frames
	}
	expect(await leaveFrames('/a', '/deep')).toEqual([
		{ opacity: 1, transform: 'translateX(0px)' },
		{ opacity: 0, transform: 'translateX(-24px)' },
	])
	expect(await leaveFrames('/deep', '/a')).toEqual([
		{ opacity: 1, transform: 'translateX(0px)' },
		{ opacity: 0, transform: 'translateX(24px)' },
	])
})

test("enter resolves when WAAPI finishes, without the settle fallback timer", async () => {
	const node = el()
	const nodeWithAnimate = node as HTMLElement & {
		animate: (keyframes: unknown, options?: unknown) => { finished: Promise<unknown> }
	}
	nodeWithAnimate.animate = () => ({ finished: Promise.resolve() })
	const { enter } = crossfade({ duration: 400 })
	const startedAt = Date.now()
	await enter(node, info("/", "/about"))
	const elapsed = Date.now() - startedAt
	expect(elapsed).toBeLessThan(350)
})

test("leaveOf no longer trails a dead zero settle", async () => {
	const node = el()
	const nodeWithAnimate = node as HTMLElement & {
		animate: (keyframes: unknown, options?: unknown) => { finished: Promise<unknown> }
	}
	let calls = 0
	nodeWithAnimate.animate = () => {
		calls++
		return { finished: Promise.resolve() }
	}
	const { leave } = crossfade({ duration: 120 })
	await leave(node, info("/hub", "/"))
	expect(calls).toBe(1)
})
