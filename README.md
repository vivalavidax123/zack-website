# zack-website

A personal site where everything is rain on a window. Songs will be drops on the glass; hover one to hear its best few seconds.

## Run it

```sh
npm install
npm run dev
```

- `/` is the home page (rain only for now).
- `/dev/rain` is the rain lab: sliders for drop size, mist, falling rain, lens strength, brightness and warmth, plus an FPS counter.

## How the rain works

`src/lib/rain` is plain TypeScript with no framework imports. Pages mount it with `createRain(canvas, config)`.

- `drops.ts` simulates water on the glass: drops land, grow, slide, stall, merge, and leave trails through the mist.
- `renderer.ts` draws it with WebGL2 in two passes: a water map of drop normals, then a composite that refracts the scene through each drop.
- `background.ts` paints the scene behind the glass (a misty forest or a city at night), or uses a photo from `static/backgrounds/`.

Without WebGL, or with reduced motion turned on, it shows a still scene instead.

## Spike

`spike/` holds the Phase 1 experiments for Spotify and Deezer previews. See `spike/FINDINGS.md`.
