import { FRESH_SECONDS, getSongs } from '#lib/server/songs.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
	// Let Vercel's edge keep the page as long as the songs list stays fresh,
	// so a visit never waits for Spotify and Deezer.
	setHeaders({
		'cache-control': `public, max-age=0, s-maxage=${FRESH_SECONDS}, stale-while-revalidate=600`
	});
	return { songs: await getSongs(fetch) };
};
