import { describe, expect, test } from 'bun:test'
import { crossfade, lift, scale, slide } from '../src/presets.ts'

const el = (): HTMLElement => {
	const node = document.createElement('div')
	document.body.append(node)
	return node
}

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
		await expect(preset.enter(node, { depth: 1, key: 0, from: '/', to: '/x' })).resolves.toBeUndefined()
	})

	test(`${name} leave resolves and clears the out-of-flow styles`, async () => {
		const node = el()
		await preset.leave(node, { depth: 1, key: 0, from: '/', to: '/x' })
		expect(node.style.position).toBe('')
		expect(node.style.width).toBe('')
	})
}

test('slide enter drifts the element via CSS transition and resets it', async () => {
	const node = el()
	const preset = slide({ distance: 10, duration: 30 })
	await preset.enter(node, { depth: 1, key: 0, from: '/', to: '/x' })
	expect(node.style.transform).toBe('translateY(0)')
	expect(node.style.transition).toBe('')
})
