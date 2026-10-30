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

/** One song on the songs page, in the site's own shape. */
export type Song = {
	/** Spotify track id. */
	id: string;
	title: string;
	artist: string;
	album: string;
	imageUrl: string | null;
	spotifyUrl: string;
	/** Favourites are your top tracks of about six months; recent ones are lately and today. */
	source: 'favourite' | 'recent';
	/** Deezer track id for the preview, or null when Deezer has no playable copy. */
	deezerId: number | null;
	/** Seconds into the 30-second Deezer preview where the best part starts. */
	climaxStart: number;
	note?: string;
};
