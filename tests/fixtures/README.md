# Test Fixtures

This directory contains deterministic files used by automated tests described in `testing.md`.

Generated files:

- `sample-1x1.png`: 1x1 red PNG.
- `sample-transparent.png`: 4x4 PNG with opaque red and transparent pixels.
- `sample-checker.png`: 16x16 black/white checkerboard PNG.
- `sample-quadrants.png`: 16x16 red/green/blue/white quadrant PNG.
- `sample-photo.jpg`: small valid JPEG fixture.
- `sample-animated.gif`: minimal animated GIF fixture.
- `sample-layers.json`: miniPaint-style multi-layer project JSON.
- `sample-old-layers.json`: miniPaint-style legacy render-function JSON.
- `sample-invalid.json`: intentionally invalid JSON.
- `sample-large.png`: 3000x2000 PNG fixture for performance/import tests.

Regenerate with:

```text
node tests/fixtures/generate-fixtures.mjs
```
