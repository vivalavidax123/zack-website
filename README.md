# zack-website

A personal site where everything is rain on a window. Songs are drops on the glass; hover one to hear its best few seconds.

## Run it

```sh
npm install
npm run dev
```

- `/` is the home page: four drops on the glass for Songs, Projects, About and Now playing.
- `/songs` is the songs page: favourites and recent plays drift down the glass. Hover (or tap) a drop to hear a preview; there is also a plain list view.
- `/api/now-playing` returns what Spotify is playing, or the last played track.
- `/api/songs` returns the songs; `/api/preview/[deezerId]` returns a fresh Deezer preview link.
- `/dev/rain` is the rain lab: sliders for drop size, mist, falling rain, lens strength, brightness and warmth, plus an FPS counter.

Now playing needs Spotify credentials in a `.env` file at the project root (never committed):

```sh
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REFRESH_TOKEN=...
```

Without them the site still runs and the drop says "Quiet for now". The refresh token comes from `spike/server.mjs` (`/login`).

Favourites live in `src/lib/data/favourites.json`. To pick them again from your all-time top tracks (Node 22.18 or newer):

```sh
node scripts/pick-favourites.ts 12
```

It keeps any `climaxStart` (seconds into the 30-second preview) and `note` you set by hand.

## How the rain works

`src/lib/rain` is plain TypeScript with no framework imports. Pages mount it with `createRain(canvas, config)`.

- `drops.ts` simulates water on the glass: drops land, grow, slide, stall, merge, and leave trails through the mist.
- `renderer.ts` draws it with WebGL2 in two passes: a water map of drop normals, then a composite that refracts the scene through each drop.
- `background.ts` paints the scene behind the glass (a misty forest or a city at night), or uses a photo from `static/backgrounds/`.

- `features.ts` holds the large drops pages place on the glass (the homepage tabs, the songs). Rain avoids them. Song drops drift down and pause when the pointer comes near.

The layout owns one engine for the whole site, so the glass keeps its drops between pages. Pages reach it through Svelte context (`src/lib/rain-handle.svelte.ts`).

Without WebGL, or with reduced motion turned on, it shows a still scene instead.

## Spike

`spike/` holds the Phase 1 experiments for Spotify and Deezer previews. See `spike/FINDINGS.md`.
