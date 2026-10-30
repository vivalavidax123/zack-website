import { error, json } from '@sveltejs/kit';
import { previewUrl } from '#lib/server/deezer.js';
import type { RequestHandler } from './$types';

/** Deezer links last about 15 minutes; reuse one for 10 so a cached link never arrives expired. */
const FRESH_SECONDS = 600;

const cache = new Map<number, { url: string | null; at: number }>();

export const GET: RequestHandler = async ({ params, fetch }) => {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id <= 0) error(400, 'Not a Deezer track id');

	let entry = cache.get(id);
	if (!entry || Date.now() - entry.at > FRESH_SECONDS * 1000) {
		entry = { url: await previewUrl(id, fetch), at: Date.now() };
		cache.set(id, entry);
	}

	return json(
		{ url: entry.url },
		{ headers: { 'Cache-Control': `public, max-age=0, s-maxage=${FRESH_SECONDS}` } }
	);
};
