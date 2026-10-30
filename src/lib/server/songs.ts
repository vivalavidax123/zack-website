import notes from '#lib/data/song-notes.json';
import type { Song } from '#lib/types.js';
import { matchOnDeezer } from './deezer.js';
import { spotifyConfigured, spotifyGet, toTrack, type SpotifyTrack } from './spotify.js';

type Fetch = typeof fetch;

/**
 * Optional hand edits in `src/lib/data/song-notes.json`, keyed by Spotify track id:
 * `{ "4uLU6hMCjMI75M1A2tKUQC": { "climaxStart": 42, "note": "..." } }`.
 * Songs without an entry start at DEFAULT_CLIMAX and have no note.
 */
type SongNote = { climaxStart?: number; note?: string };

/** Favourites: your top tracks of about the last six months that have a Deezer preview. */
const FAVOURITES = 12;
/** How many songs the page shows in total, favourites first. */
const MAX_SONGS = 25;
/** Where a preview starts when nobody has picked a moment. */
const DEFAULT_CLIMAX = 10;
/** Ask Spotify again after this long, so new listening shows up soon. */
export const FRESH_SECONDS = 10 * 60;

let cached: { songs: Song[]; at: number } | null = null;
/** Deezer matches never change, so each song is matched once per server. */
const deezerIds = new Map<string, number | null>();

async function items(path: string, fetch: Fetch): Promise<SpotifyTrack[]> {
	const res = await spotifyGet(path, fetch);
	if (!res.ok) return [];
	const body = (await res.json()) as { items: (SpotifyTrack | { track: SpotifyTrack })[] };
	return body.items
		.map((i) => ('track' in i ? i.track : i))
		.filter((t) => (t.type ?? 'track') === 'track');
}

async function deezerId(t: SpotifyTrack, fetch: Fetch): Promise<number | null> {
	if (!deezerIds.has(t.id)) {
		const { title, artist } = toTrack(t);
		const match = await matchOnDeezer({ isrc: t.external_ids?.isrc, title, artist }, fetch);
		deezerIds.set(t.id, match.deezerId);
	}
	return deezerIds.get(t.id) ?? null;
}

/** Match a handful at a time: Deezer allows about 50 requests per 5 seconds. */
async function withDeezer(tracks: SpotifyTrack[], fetch: Fetch) {
	const out: { track: SpotifyTrack; deezerId: number | null }[] = [];
	for (let i = 0; i < tracks.length; i += 5) {
		const batch = tracks.slice(i, i + 5);
		const ids = await Promise.all(batch.map((t) => deezerId(t, fetch)));
		out.push(...batch.map((track, k) => ({ track, deezerId: ids[k] })));
	}
	return out;
}

/** Adapter: a Spotify track plus its Deezer match → the site's Song shape. */
function toSong(t: SpotifyTrack, deezerId: number | null, source: Song['source']): Song {
	const note = (notes as Record<string, SongNote>)[t.id];
	return {
		id: t.id,
		...toTrack(t),
		source,
		deezerId,
		climaxStart: note?.climaxStart ?? DEFAULT_CLIMAX,
		note: note?.note || undefined
	};
}

/**
 * Everything comes live from Spotify: favourites are your top tracks of about
 * the last six months, then what you love lately and what you played today,
 * without duplicates. Cache-aside for FRESH_SECONDS, so a busy page still asks
 * Spotify rarely.
 */
export async function getSongs(fetch: Fetch): Promise<Song[]> {
	if (cached && Date.now() - cached.at < FRESH_SECONDS * 1000) return cached.songs;
	if (!spotifyConfigured()) return [];

	try {
		const [favourite, lately, recent] = await Promise.all([
			items('/me/top/tracks?time_range=medium_term&limit=20', fetch),
			items('/me/top/tracks?time_range=short_term&limit=20', fetch),
			items('/me/player/recently-played?limit=30', fetch)
		]);

		// The same recording can have several Spotify ids, so also compare ISRCs.
		const seen = new Set<string>();
		const fresh = (t: SpotifyTrack) => {
			const keys = [t.id, t.external_ids?.isrc].filter((k): k is string => Boolean(k));
			if (keys.some((k) => seen.has(k))) return false;
			keys.forEach((k) => seen.add(k));
			return true;
		};

		// A favourite with no preview would be a silent big drop; take the next one instead.
		const favourites = (await withDeezer(favourite.filter(fresh), fetch))
			.filter((f) => f.deezerId)
			.slice(0, FAVOURITES);
		const others = [...lately, ...recent]
			.filter(fresh)
			.slice(0, Math.max(0, MAX_SONGS - favourites.length));

		const songs = [
			...favourites.map((f) => toSong(f.track, f.deezerId, 'favourite')),
			...(await withDeezer(others, fetch)).map((r) => toSong(r.track, r.deezerId, 'recent'))
		];
		cached = { songs, at: Date.now() };
		return songs;
	} catch (err) {
		console.error(err);
		// Spotify is down or slow: show the last good list rather than nothing.
		return cached?.songs ?? [];
	}
}
