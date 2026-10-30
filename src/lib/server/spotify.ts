import * as env from '$app/env/private';
import type { NowPlaying, Track } from '#lib/types.js';

/**
 * Talks to Spotify with the long-lived refresh token from the environment.
 * Lives under lib/server, so SvelteKit refuses to bundle it into browser code.
 */

type Fetch = typeof fetch;

type SpotifyTrack = {
	type?: string;
	name: string;
	artists: { name: string }[];
	album: { name: string; images: { url: string; width: number }[] };
	external_urls: { spotify: string };
};

let accessToken: { value: string; expiresAt: number } | null = null;

export function spotifyConfigured(): boolean {
	return Boolean(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET && env.SPOTIFY_REFRESH_TOKEN);
}

/** Trade the refresh token for a short-lived access token, reusing it until a minute before expiry. */
async function getAccessToken(fetch: Fetch): Promise<string> {
	if (accessToken && Date.now() < accessToken.expiresAt) return accessToken.value;

	const basic = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
	const res = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			Authorization: `Basic ${basic}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: env.SPOTIFY_REFRESH_TOKEN ?? ''
		})
	});
	if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);
	const body = (await res.json()) as { access_token: string; expires_in: number };
	accessToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in - 60) * 1000 };
	return accessToken.value;
}

async function spotifyGet(path: string, fetch: Fetch): Promise<Response> {
	const token = await getAccessToken(fetch);
	return fetch(`https://api.spotify.com/v1${path}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
}

/** Adapter: Spotify's track object → the site's Track shape. */
function toTrack(t: SpotifyTrack): Track {
	const images = [...t.album.images].sort((a, b) => a.width - b.width);
	// The smallest image that is still at least 200px wide is plenty for a drop.
	const image = images.find((i) => i.width >= 200) ?? images.at(-1);
	return {
		title: t.name,
		artist: t.artists.map((a) => a.name).join(', '),
		album: t.album.name,
		imageUrl: image?.url ?? null,
		spotifyUrl: t.external_urls.spotify
	};
}

export async function fetchNowPlaying(fetch: Fetch): Promise<NowPlaying> {
	const current = await spotifyGet('/me/player/currently-playing', fetch);
	// 204 means nothing is playing: a normal state, not an error.
	if (current.status === 200) {
		const body = (await current.json()) as { is_playing: boolean; item: SpotifyTrack | null };
		if (body.is_playing && body.item && (body.item.type ?? 'track') === 'track') {
			return { state: 'playing', track: toTrack(body.item) };
		}
	} else if (current.status !== 204) {
		throw new Error(`Spotify currently-playing failed: ${current.status}`);
	}

	const recent = await spotifyGet('/me/player/recently-played?limit=1', fetch);
	if (!recent.ok) throw new Error(`Spotify recently-played failed: ${recent.status}`);
	const body = (await recent.json()) as { items: { track: SpotifyTrack; played_at: string }[] };
	const last = body.items[0];
	if (!last) return { state: 'unavailable' };
	return { state: 'recent', track: toTrack(last.track), playedAt: last.played_at };
}
