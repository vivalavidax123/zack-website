import { json } from '@sveltejs/kit';
import { getSongs } from '#lib/server/songs.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	return json(await getSongs(fetch), {
		headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=600' }
	});
};
