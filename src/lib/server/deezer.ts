/**
 * Finds Deezer copies of songs and their 30-second previews.
 * Plain TypeScript with no SvelteKit imports, so `scripts/pick-favourites.ts`
 * can reuse it under Node.
 *
 * Phase 1 showed: an ISRC lookup finds the exact recording, but sometimes a copy
 * with no preview. Then a plain "artist title" search with an artist-name check
 * finds a playable copy. Preview links expire after about 15 minutes, so we only
 * ever store the track id and ask for a fresh link at play time.
 */

type Fetch = typeof fetch;

type DeezerTrack = {
	id: number;
	title: string;
	preview: string;
	artist: { name: string };
	error?: unknown;
};

export type DeezerMatch = { deezerId: number | null; matchedBy: 'isrc' | 'search' | 'none' };

const API = 'https://api.deezer.com';

/** Compare artist names loosely: case, a leading "The", spaces and punctuation don't matter. */
const norm = (s: string) =>
	s
		.toLowerCase()
		.replace(/^the\s+/, '')
		.replace(/[^\p{L}\p{N}]/gu, '');

async function getJson<T>(fetch: Fetch, url: string): Promise<T | null> {
	const res = await fetch(url);
	if (!res.ok) return null;
	const body = (await res.json()) as T & { error?: unknown };
	return body.error ? null : body;
}

export async function matchOnDeezer(
	song: { isrc?: string; title: string; artist: string },
	fetch: Fetch = globalThis.fetch
): Promise<DeezerMatch> {
	if (song.isrc) {
		const byIsrc = await getJson<DeezerTrack>(fetch, `${API}/track/isrc:${song.isrc}`);
		if (byIsrc?.preview) return { deezerId: byIsrc.id, matchedBy: 'isrc' };
	}

	const firstArtist = song.artist.split(',')[0].trim();
	const title = song.title.replace(/\s*[([](feat|with)\.?[^)\]]*[)\]]/i, '');
	const q = encodeURIComponent(`${firstArtist} ${title}`);
	const search = await getJson<{ data: DeezerTrack[] }>(fetch, `${API}/search?q=${q}&limit=10`);
	const hit = search?.data.find((t) => t.preview && norm(t.artist.name) === norm(firstArtist));
	return hit ? { deezerId: hit.id, matchedBy: 'search' } : { deezerId: null, matchedBy: 'none' };
}

/** A fresh, signed preview link for a Deezer track, or null when it has none. */
export async function previewUrl(
	deezerId: number,
	fetch: Fetch = globalThis.fetch
): Promise<string | null> {
	const track = await getJson<DeezerTrack>(fetch, `${API}/track/${deezerId}`);
	return track?.preview || null;
}
