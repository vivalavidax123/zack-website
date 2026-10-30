import { json } from '@sveltejs/kit';
import { fetchNowPlaying, spotifyConfigured } from '#lib/server/spotify.js';
import type { NowPlaying } from '#lib/types.js';
import type { RequestHandler } from './$types';

/** Seconds an answer is reused before Spotify is asked again. */
const FRESH_SECONDS = 30;

// Cache-aside: answer from memory while fresh, otherwise ask Spotify and remember.
// Each serverless instance keeps its own copy; the CDN header below shares one across visitors.
let cached: { value: NowPlaying; at: number } | null = null;

export const GET: RequestHandler = async ({ fetch }) => {
	let value: NowPlaying;
	if (cached && Date.now() - cached.at < FRESH_SECONDS * 1000) {
		value = cached.value;
	} else if (!spotifyConfigured()) {
		value = { state: 'unavailable' };
	} else {
		try {
			value = await fetchNowPlaying(fetch);
			cached = { value, at: Date.now() };
		} catch (err) {
			console.error(err);
			// A stale answer is better than none while Spotify has a hiccup.
			value = cached?.value ?? { state: 'unavailable' };
		}
	}

	return json(value, {
		headers: {
			'Cache-Control': `public, max-age=0, s-maxage=${FRESH_SECONDS}, stale-while-revalidate=60`
		}
	});
};
