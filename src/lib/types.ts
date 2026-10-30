/** One track, in the site's own shape, whatever API it came from. */
export type Track = {
	title: string;
	artist: string;
	album: string;
	imageUrl: string | null;
	spotifyUrl: string;
};

/**
 * What `/api/now-playing` returns. The frontend always receives this one shape:
 * - `playing`: Spotify is playing a track right now,
 * - `recent`: nothing is playing, so this is the last track and when it played,
 * - `unavailable`: Spotify is not configured or could not be reached.
 */
export type NowPlaying =
	| { state: 'playing'; track: Track }
	| { state: 'recent'; track: Track; playedAt: string }
	| { state: 'unavailable' };
