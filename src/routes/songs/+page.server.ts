import { getSongs } from '#lib/server/songs.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	return { songs: await getSongs(fetch) };
};
