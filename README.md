# zack-website

A personal site where everything is rain on a window. Songs are drops on the glass; hover one to hear its best few seconds.

Live at **https://zemingxia.com**. Every merge to `main` deploys there automatically, and every pull request gets a Vercel preview link.

## Run it

```sh
npm install
npm run dev
```

- `/` is the home page: four drops on the glass for Songs, Projects, About and Now playing.
- `/projects` shows projects as still drops; click one to open its story. Projects live in `src/lib/data/projects.ts`.
- `/about` is a short intro, study timeline and links, from `src/lib/data/about.ts`.
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

The songs page needs the same credentials. Every song comes live from Spotify (refreshed every 10 minutes): favourites are your top tracks of about the last six months, then your top tracks of the last four weeks and your recent plays.

To start a song's preview at its best part, or give it a note, add it to `src/lib/data/song-notes.json` by Spotify track id:

```json
{ "4uLU6hMCjMI75M1A2tKUQC": { "climaxStart": 42, "note": "The one for rainy evenings" } }
```

`climaxStart` is seconds into Deezer's 30-second preview.

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

## Deploy

The site runs on Vercel (`@sveltejs/adapter-vercel`). The three Spotify values are stored as encrypted environment variables in the Vercel project, for Production and Preview; nothing secret is in the repo. API responses are cached at Vercel's edge (`s-maxage`), so Spotify and Deezer are asked at most every few minutes however many people visit.
