# Phase 1 spike – Deezer findings (2026-10-30)

Files: `probe.mjs` (matching + preview probe; raw output in `probe-output.json`), `server.mjs` (local server on http://127.0.0.1:5173), `deezer-test.html` (play buttons).

## 1. Matching

**Surprise:** the documented advanced search `artist:"X" track:"Y"` returned **0 results for every song**. Any query using `artist:` (quoted or not) returns nothing today; `track:"Y"` and `album:"Y"` still work. Working forms: plain `X Y`, or `X track:"Y"`.

| Song | Plain search `Artist Title` top hit | `Artist track:"Title"` top hit | ISRC of correct original | `/track/isrc:` returns |
|---|---|---|---|---|
| Radiohead – Creep | ✅ 138547415 Creep [Pablo Honey] | ✅ same | GBAYE9200070 | ✅ same id 138547415 |
| Fleetwood Mac – Dreams | ✅ 63480987 Dreams (2004 Remaster) [Rumours] | ❌ Eurythmics – Sweet Dreams (FM is #2) | USWB10400046 | ✅ same id 63480987 |
| Queen – Bohemian Rhapsody | ✅ 4091937401 [A Night At The Opera] | ✅ same | GBUM71029604 | ⚠️ 3541552051 "(Remastered 2011)" on a compilation (same recording/ISRC, different Deezer id) |
| Nirvana – Smells Like Teen Spirit | ✅ 13791930 [Nevermind (Remastered)] | ✅ same | USGF19942501 | ⚠️ 13693497 on "Nevermind (Deluxe Edition)" (same recording, different id) |
| Nirvana – SLTS **live** | #2: 1543592472 "(Live In Del Mar, California/1991)" | #2/#3 (two album copies, same ISRC USGF19610505) | USGF19610505 | (live has its own ISRC, so ISRC distinguishes live vs studio) |
| Grouper – Heavy Water/I'd Rather Be Sleeping (obscure) | ✅ 64428756 [Dragging a Dead Deer Up a Hill] (only result) | ✅ same, 2 covers below | USI4R1115074 | ✅ same id |

Notes:
- `title_version` reliably flags variants: "(Live In Del Mar…)", "(Acoustic)", "(2004 Remaster)". Live versions have **different ISRCs** from the studio cut.
- Search results already include `isrc`, `rank`, `duration` — no extra `/track/{id}` call needed for matching.
- The same recording appears under several Deezer ids (original album, deluxe, compilations) sharing one ISRC. `/track/isrc:` picks one of them, not necessarily the original album copy — fine for audio, but album art/name may be a compilation.
- Some "studio originals" on Deezer are only available as remasters (Dreams = "2004 Remaster" on Rumours). That *is* the right version for our purposes.

**Verdict:** ISRC is the more reliable key. A title+artist search got the wrong artist once (Dreams with `track:`) and live/acoustic variants rank close behind the original. ISRC lookup always returned the exact recording (6/6), though sometimes a different album copy. Plan: get the ISRC from Spotify (`external_ids.isrc`) → `/track/isrc:{ISRC}` → store the Deezer **track id**. Fallback when there's no ISRC: plain `Artist Title` search, filter by artist name match and empty/remaster-only `title_version`, prefer highest rank. Hand-check obscure picks.

## 2. Preview URL expiry

- Preview URLs look like `https://cdnt-preview.dzcdn.net/api/1/1/…/<hash>.mp3?hdnea=exp=<unix>~acl=…~data=user_id=0,application_id=42~hmac=<sig>` (Akamai-style signed token).
- `exp` is **~15 minutes** after the request (measured 897–901 s).
- Every `/track/{id}` call issues a **new** URL (new `exp` and `hmac`, same file path).
- Tampering `exp` to a past time → **403**. Dropping the query string → **403**. So old URLs will fail after ~15 min.

**Verdict:** never store preview URLs. Store Deezer track ids (plus ISRC) and fetch a fresh preview URL at play time (or when the page loads, if the session will be under ~15 min; refetch on `error`).

## 3. CORS and playback

- **API** (`api.deezer.com`): sends `Access-Control-Allow-Methods/Headers/Credentials` but **no `Access-Control-Allow-Origin`**, so browser `fetch()` fails ("Failed to fetch", confirmed in the browser). Use a tiny server proxy (`/api/preview/:id` in `server.mjs`, ~5 lines) or JSONP (`output=jsonp`). The proxy is simpler and will map well to a serverless function later.
- **Preview MP3** (`cdnt-preview.dzcdn.net`): `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: Range`, `Accept-Ranges: bytes`, `Cache-Control: public, max-age≈148 days`. A cross-origin `fetch` with a Range header returned 206 — so Web Audio would also work if ever needed.
- **Plain `<audio>` + volume fades: work.** Measured in Chromium: click → playing in ~440 ms (proxy + load), seeking to `climaxStart` = 10 s on `loadedmetadata` landed at 10.05 s, volume ramped 0 → 0.15 → 0.65 → 1.0 over ~400 ms, fade-out to 0 then `pause()` worked.
- Caveat: previews are 30 s clips of Deezer's choosing (not necessarily the chorus), so `climaxStart` is an offset *within the preview*, max ~29 s. iOS Safari ignores `audio.volume` (always 1) — fades won't be audible on iPhone; would need Web Audio GainNode there if that matters.

## Surprises
1. `artist:"…"` advanced search filter is broken (0 results).
2. ISRC lookup can return a compilation copy rather than the original album.
3. Preview links last only ~15 minutes.

# Spotify findings (steps 2–3)

- **OAuth:** Authorization Code flow via `server.mjs` (`/login` → `/callback`) worked first try. All three scopes were granted, and the refresh token was saved to `.env`, which is gitignored and was never printed. `spotify-samples.mjs` exchanges the refresh token for an access token. Spotify did **not** issue a new refresh token on refresh, so the stored one stays valid.
- **No 403 or Premium/developer-mode errors.** Results in `samples/` (trimmed: ids, names, artists, album, ISRC, duration; no tokens):
  - `/me/top/tracks?time_range=short_term` → 200
  - `/me/player/recently-played` → 200
  - `/me/player/currently-playing` → **204 No Content** when nothing is playing (no JSON body), so the site must handle 204.
- `external_ids.isrc` **is present** on every track. `preview_url` is always `null` (Spotify no longer gives previews), and `popularity` was missing too. So Deezer is needed for audio.
- **Spotify ISRC → Deezer `/track/isrc:`** (`samples/isrc-to-deezer.json`): **11/11 resolved to the right song**, including Chinese, K-pop, game soundtrack, indie and remix tracks. **10/11 had a preview.** Olly Murs – Troublemaker resolved to a copy with no preview, so a fallback search for another copy with a preview is worth adding.

# Real favourites test (`/songs`)

- Pipeline (`resolve-favourites.mjs` → `favourites.sample.json`): Spotify ISRC → Deezer `/track/isrc:`. If that copy has no preview, the script falls back to a plain `artist title` search and takes the first hit whose normalised artist name matches and that has a preview. The Deezer id is stored. At play time the page calls `/api/preview/:id` for a fresh URL, and shows "no preview" if there's none.
- 4/5 matched by ISRC. For Olly Murs – Troublemaker, the ISRC copy had no preview. The fallback search found another copy with the **same ISRC** on a different album (1003653522, "You Know I Know (Expanded Edition)") that does have a preview.
- `climaxStart` is 10 s for all five (a guess). Edit it in `favourites.sample.json` and reload `/songs`; no restart is needed.
- `/api/now-playing` maps Spotify's 204 to `{ is_playing: false }`, and the page shows "Spotify: not playing".
- Rapid-switching lesson: with a single `<audio>` element, a second click while the first song is still loading aborts the first `play()` (`AbortError`). The page now keeps a "last click wins" counter and ignores `AbortError`. In the browser test, three clicks 80 ms apart left exactly one song playing and highlighted, starting at climaxStart and fully faded in.
