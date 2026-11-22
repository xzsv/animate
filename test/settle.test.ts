import { describe, expect, test } from 'bun:test'
import { reduced, settle } from '../src/settle.ts'

test('reduced() is boolean and false without a media query match', () => {
	expect(typeof reduced()).toBe('boolean')
	expect(reduced()).toBe(false)
})

test('settle resolves via the timeout fallback when no transitionend fires', async () => {
	const node = document.createElement('div')
	document.body.append(node)
	const started = Date.now()
	await settle(node, 30)
	expect(Date.now() - started).toBeGreaterThanOrEqual(30)
})

test('settle resolves immediately for non-positive durations', async () => {
	const node = document.createElement('div')
	await expect(settle(node, 0)).resolves.toBeUndefined()
})
