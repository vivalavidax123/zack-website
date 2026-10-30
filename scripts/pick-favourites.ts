/**
 * Picks the songs page favourites from your all-time top tracks on Spotify and
 * writes them, with their Deezer match, to src/lib/data/favourites.json.
 *
 * Run it on your own computer, where .env holds the Spotify secrets:
 *   node scripts/pick-favourites.ts [count]
 * (Node 22.18 or newer runs TypeScript directly.)
 *
 * Re-running keeps the climaxStart and note you set by hand for songs that stay.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { matchOnDeezer } from '../src/lib/server/deezer.ts';

const OUT = 'src/lib/data/favourites.json';
const count = Number(process.argv[2] ?? 12);

process.loadEnvFile('.env');
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
	throw new Error('.env needs SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_REFRESH_TOKEN');
}

type SpotifyTrack = {
	id: string;
	name: string;
	external_ids?: { isrc?: string };
	artists: { name: string }[];
	album: { name: string; images: { url: string; width: number }[] };
	external_urls: { spotify: string };
};

const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
	method: 'POST',
	headers: {
		Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
		'Content-Type': 'application/x-www-form-urlencoded'
	},
	body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: SPOTIFY_REFRESH_TOKEN })
});
if (!tokenRes.ok) throw new Error(`Spotify token request failed: ${tokenRes.status}`);
const { access_token } = (await tokenRes.json()) as { access_token: string };

// Ask for extra, because a few may have no playable copy on Deezer.
const topRes = await fetch(
	`https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=${Math.min(50, count * 2)}`,
	{ headers: { Authorization: `Bearer ${access_token}` } }
);
if (!topRes.ok) throw new Error(`Spotify top tracks failed: ${topRes.status}`);
const { items } = (await topRes.json()) as { items: SpotifyTrack[] };

const previous = new Map<string, { climaxStart: number; note?: string }>(
	existsSync(OUT)
		? JSON.parse(readFileSync(OUT, 'utf8')).map((f: { spotifyId: string }) => [f.spotifyId, f])
		: []
);

const picked = [];
for (const t of items) {
	if (picked.length >= count) break;
	const artist = t.artists.map((a) => a.name).join(', ');
	const match = await matchOnDeezer({ isrc: t.external_ids?.isrc, title: t.name, artist });
	console.log(`${match.matchedBy.padEnd(6)} ${artist} - ${t.name}`);
	if (!match.deezerId) continue;
	const images = [...t.album.images].sort((a, b) => a.width - b.width);
	const image = images.find((i) => i.width >= 200) ?? images.at(-1);
	const kept = previous.get(t.id);
	picked.push({
		spotifyId: t.id,
		isrc: t.external_ids?.isrc ?? '',
		title: t.name,
		artist,
		album: t.album.name,
		imageUrl: image?.url ?? null,
		spotifyUrl: t.external_urls.spotify,
		deezerId: match.deezerId,
		climaxStart: kept?.climaxStart ?? 10,
		note: kept?.note ?? ''
	});
}

writeFileSync(OUT, JSON.stringify(picked, null, '\t') + '\n');
console.log(`Wrote ${picked.length} favourites to ${OUT}`);
