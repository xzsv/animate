/**
 * @xzsv/animate — transition presets and settle plumbing for
 * @xzsv/router. The router orchestrates (dispatch enter/leave past the
 * equality point, hold the dual tree, bound by timeoutMs); this package
 * supplies what to do inside those callbacks. Zero animation code lives
 * in the router; zero orchestration code lives here.
 */
export { crossfade, lift, scale, slide } from './presets.ts'
export type { PresetOptions } from './presets.ts'
export { played, reduced, settle } from './settle.ts'
