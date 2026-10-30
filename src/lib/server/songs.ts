import favourites from '#lib/data/favourites.json';
import type { Song } from '#lib/types.js';
import { matchOnDeezer } from './deezer.js';
import { spotifyConfigured, spotifyGet, toTrack, type SpotifyTrack } from './spotify.js';

type Fetch = typeof fetch;

/** The hand-kept list in `src/lib/data/favourites.json`. Edit climaxStart and note there. */
export type Favourite = {
	spotifyId: string;
	isrc: string;
	title: string;
	artist: string;
	album: string;
	imageUrl: string | null;
	spotifyUrl: string;
	deezerId: number | null;
	climaxStart: number;
	note?: string;
};

/** How many songs the page shows in total, favourites first. */
const MAX_SONGS = 25;
/** Where a live song's preview starts when nobody has picked a moment. */
const DEFAULT_CLIMAX = 10;
const FRESH_MS = 60 * 60 * 1000;

let cached: { songs: Song[]; at: number } | null = null;
const deezerIds = new Map<string, number | null>();

function fromFavourite(f: Favourite): Song {
	return {
		id: f.spotifyId,
		title: f.title,
		artist: f.artist,
		album: f.album,
		imageUrl: f.imageUrl,
		spotifyUrl: f.spotifyUrl,
		source: 'favourite',
		deezerId: f.deezerId,
		climaxStart: f.climaxStart,
		note: f.note || undefined
	};
}

/** Top tracks first (what you love lately), then recent plays (what you played today). */
async function liveTracks(fetch: Fetch): Promise<SpotifyTrack[]> {
	const [top, recent] = await Promise.all([
		spotifyGet('/me/top/tracks?time_range=short_term&limit=20', fetch),
		spotifyGet('/me/player/recently-played?limit=30', fetch)
	]);
	const tracks: SpotifyTrack[] = [];
	if (top.ok) tracks.push(...((await top.json()) as { items: SpotifyTrack[] }).items);
	if (recent.ok) {
		const body = (await recent.json()) as { items: { track: SpotifyTrack }[] };
		tracks.push(...body.items.map((i) => i.track));
	}
	return tracks.filter((t) => (t.type ?? 'track') === 'track');
}

/** Adapter: a Spotify track plus its Deezer match → the site's Song shape. */
async function toSong(t: SpotifyTrack, fetch: Fetch): Promise<Song> {
	const track = toTrack(t);
	if (!deezerIds.has(t.id)) {
		const match = await matchOnDeezer(
			{ isrc: t.external_ids?.isrc, title: track.title, artist: track.artist },
			fetch
		);
		deezerIds.set(t.id, match.deezerId);
	}
	return {
		id: t.id,
		...track,
		source: 'recent',
		deezerId: deezerIds.get(t.id) ?? null,
		climaxStart: DEFAULT_CLIMAX
	};
}

/**
 * Favourites plus live listening, without duplicates, up to MAX_SONGS.
 * Cache-aside for an hour: Spotify and Deezer are asked at most once an hour per server.
 */
export async function getSongs(fetch: Fetch): Promise<Song[]> {
	if (cached && Date.now() - cached.at < FRESH_MS) return cached.songs;

	const songs = (favourites as Favourite[]).map(fromFavourite);
	const seen = new Set(songs.map((s) => s.id));
	const seenIsrc = new Set((favourites as Favourite[]).map((f) => f.isrc));

	if (spotifyConfigured()) {
		try {
			const picks = (await liveTracks(fetch))
				.filter((t) => {
					const isrc = t.external_ids?.isrc;
					if (seen.has(t.id) || (isrc && seenIsrc.has(isrc))) return false;
					seen.add(t.id);
					if (isrc) seenIsrc.add(isrc);
					return true;
				})
				.slice(0, Math.max(0, MAX_SONGS - songs.length));
			// Deezer allows about 50 requests per 5 seconds; a handful at a time stays well clear.
			for (let i = 0; i < picks.length; i += 5) {
				songs.push(...(await Promise.all(picks.slice(i, i + 5).map((t) => toSong(t, fetch)))));
			}
		} catch (err) {
			console.error(err);
			// Favourites alone still make a page.
		}
	}

	cached = { songs, at: Date.now() };
	return songs;
}
