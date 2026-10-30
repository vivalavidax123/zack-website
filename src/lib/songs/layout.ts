import type { FeatureDrop } from '#lib/rain/index.js';
import { between, seeded } from '#lib/rain/random.js';
import type { Song } from '#lib/types.js';

/**
 * Every song drifts at the same pace, so the glass reads as calm, not busy,
 * and drops that start apart never run into each other.
 */
export const DRIFT_SPEED = 9;

/**
 * Scatter the songs over the glass. Lanes keep drops from piling up side by
 * side; a seeded jitter makes it look like rain rather than a grid, and the
 * same on every visit. Favourites are the big drops, recent plays smaller.
 */
export function songDrops(songs: Song[], width: number, height: number): FeatureDrop[] {
	if (!songs.length || !width || !height) return [];
	const rand = seeded(7);
	const narrow = width < 700;
	const big = Math.max(30, (narrow ? 0.11 * width : 0.055 * Math.min(width, height * 1.6)) | 0);
	const lanes = Math.max(3, Math.floor(width / (big * 3.2)));
	const lane = width / lanes;
	// Drops wrap from the bottom back to the top, so one screen is one full cycle.
	// Rows share it out evenly, which keeps drops in the same lane apart.
	const rows = Math.ceil(songs.length / lanes);
	const rowGap = (height + big * 2) / rows;

	// Each row takes every lane once, in a shuffled order.
	const columns: number[] = [];
	while (columns.length < songs.length) {
		columns.push(
			...shuffle(
				Array.from({ length: lanes }, (_, k) => k),
				rand
			)
		);
	}

	// Mix favourites and recent plays over the glass instead of big ones on top.
	const slots = shuffle(
		songs.map((_, i) => i),
		rand
	);

	return songs.map((song, k) => {
		const i = slots[k];
		const r = song.source === 'favourite' ? big : big * 0.6;
		const column = columns[i];
		const x = (column + 0.5) * lane + between(rand, -0.25, 0.25) * lane;
		const row = Math.floor(i / lanes);
		const y = (row + 0.5 + between(rand, -0.3, 0.3)) * rowGap - big;
		return {
			id: song.id,
			x: Math.min(width - r, Math.max(r, x)),
			y,
			r,
			drift: DRIFT_SPEED
		};
	});
}

function shuffle<T>(items: T[], rand: () => number): T[] {
	for (let k = items.length - 1; k > 0; k--) {
		const j = Math.floor(rand() * (k + 1));
		[items[k], items[j]] = [items[j], items[k]];
	}
	return items;
}
