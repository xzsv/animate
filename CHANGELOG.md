# Changelog

## Unreleased

### Fixed

- WAAPI presets (`crossfade`, `lift`, `scale`) no longer double-wait:
  `played()` already resolves on the animation's `finished` promise, so
  the trailing `settle(el, duration)` — which always burned the full
  `duration + 80 ms` fallback timer — is gone. Route hand-offs release
  ~`duration + 80 ms` sooner (ISSUES #11 in @xzsv/router).

## 0.2.0

### Added

- `slide({ axis, easing, order })` is direction-aware: give it an
  `order(path)` rank and the slide reverses whenever `order(to)` is
  lower than `order(from)` — the shape Ember Circuit hand-rolled with
  its `rank()` helper. `axis` picks `translateX` vs `translateY`
  (default `'y'`), `easing` overrides the default `'ease-out'`.

## 0.1.x

- 0.1.2 — peer dependencies use semver (the `workspace:` protocol broke
  non-workspace installs).
- 0.1.1 — `played()` is async and swallows WAAPI failures; tsc scoped
  to `src`.
- 0.1.0 — initial release: `settle`, `reduced`, `played`, and the
  `crossfade` / `slide` / `lift` / `scale` presets.
